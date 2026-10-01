import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateCode } from '@/lib/utils';
import { z } from 'zod';

const onlineItemSchema = z.object({
  variantId: z.string().min(1, 'ID da variação é obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
});

const onlineCheckoutSchema = z.object({
  customerName: z.string().min(2, 'Informe seu nome completo'),
  customerPhone: z.string().min(8, 'Informe seu telefone'),
  customerWhatsapp: z.string().optional().nullable(),
  customerEmail: z.string().email('E-mail inválido').optional().nullable(),
  customerDoc: z.string().optional().nullable(),
  deliveryType: z.enum(['RETIRADA', 'ENTREGA']).default('RETIRADA'),
  zipCode: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  paymentMethod: z.string().default('PIX'),
  notes: z.string().optional().nullable(),
  items: z.array(onlineItemSchema).min(1, 'O carrinho está vazio'),
});

export async function POST(request: Request) {
  try {
    const store = await prisma.store.findFirst();
    if (!store) {
      return NextResponse.json({ error: 'Loja não configurada' }, { status: 404 });
    }

    const body = await request.json();
    const result = onlineCheckoutSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;
    const orderNumber = generateCode('PED', 5);

    // 1. Validação de Estoque Disponível para todos os itens
    const variantIds = data.items.map((it) => it.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: true,
        stock: true,
      },
    });

    if (variants.length !== data.items.length) {
      return NextResponse.json(
        { error: 'Um ou mais produtos selecionados não foram encontrados.' },
        { status: 400 }
      );
    }

    // Calcula Subtotal e valida estoque
    let subtotal = 0;
    const validatedItems = data.items.map((item) => {
      const v = variants.find((variant) => variant.id === item.variantId)!;
      const physical = v.stock?.quantity || 0;
      const reserved = v.stock?.reservedQuantity || 0;
      const available = physical - reserved;

      if (available < item.quantity) {
        throw new Error(
          `Estoque insuficiente para a peça "${v.product.name} (${v.size} - ${v.color})". Disponível: ${available}, Solicitado: ${item.quantity}`
        );
      }

      const unitPrice = Number(v.sellPrice ?? v.product.sellPrice ?? 0);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        variantId: v.id,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    // 2. Validação de Cupom de Desconto se houver
    let discountAmount = 0;
    if (data.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          storeId: store.id,
          code: data.couponCode.toUpperCase().trim(),
          isActive: true,
        },
      });

      if (coupon) {
        if (coupon.minValue && subtotal < coupon.minValue) {
          // valor mínimo não atingido
        } else {
          if (coupon.discountType === 'PERCENTUAL') {
            discountAmount = (subtotal * coupon.discountValue) / 100;
          } else {
            discountAmount = coupon.discountValue;
          }
          // Incrementa uso do cupom
          await prisma.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: coupon.usedCount + 1 },
          });
        }
      }
    }

    const shippingFee = data.deliveryType === 'ENTREGA' ? 15.0 : 0.0;
    const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);

    // 3. Transação ACID de Reserva de Estoque e Criação do Pedido
    const completedOrder = await prisma.$transaction(async (tx) => {
      // 3.1. Busca ou cria o cliente
      let customer = null;
      if (data.customerDoc || data.customerPhone) {
        customer = await tx.customer.findFirst({
          where: {
            storeId: store.id,
            OR: [
              ...(data.customerDoc ? [{ documentNumber: data.customerDoc }] : []),
              { phone: data.customerPhone },
            ],
          },
        });

        if (!customer) {
          customer = await tx.customer.create({
            data: {
              storeId: store.id,
              name: data.customerName,
              phone: data.customerPhone,
              whatsapp: data.customerWhatsapp || data.customerPhone,
              email: data.customerEmail || null,
              documentNumber: data.customerDoc || null,
              zipCode: data.zipCode || null,
              address: data.address || null,
              number: data.number || null,
              complement: data.complement || null,
              neighborhood: data.neighborhood || null,
              city: data.city || null,
              state: data.state || null,
            },
          });
        }
      }

      // 3.2. Cria o Pedido Online
      const order = await tx.order.create({
        data: {
          storeId: store.id,
          customerId: customer?.id || null,
          orderNumber,
          status: 'NOVO',
          deliveryType: data.deliveryType,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerWhatsapp: data.customerWhatsapp || data.customerPhone,
          customerEmail: data.customerEmail || null,
          customerDoc: data.customerDoc || null,
          zipCode: data.zipCode || null,
          address: data.address || null,
          number: data.number || null,
          complement: data.complement || null,
          neighborhood: data.neighborhood || null,
          city: data.city || null,
          state: data.state || null,
          subtotal,
          shippingFee,
          discountAmount,
          totalAmount,
          couponCode: data.couponCode || null,
          notes: data.notes || null,
        },
      });

      // 3.3. Cria Itens do Pedido e Efetua Reserva Atômica de Estoque
      const reservationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      for (const item of validatedItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          },
        });

        // Atualiza reservedQuantity no estoque físico
        await tx.stock.update({
          where: { variantId: item.variantId },
          data: {
            reservedQuantity: {
              increment: item.quantity,
            },
          },
        });

        // Cria registro de Reserva de Estoque
        await tx.stockReservation.create({
          data: {
            variantId: item.variantId,
            orderId: order.id,
            quantity: item.quantity,
            expiresAt: reservationExpiresAt,
          },
        });
      }

      // 3.4. Registra intenção de pagamento
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: data.paymentMethod,
          amount: totalAmount,
          installments: 1,
        },
      });

      return order;
    });

    // 4. Link Direto para Atendimento no WhatsApp da Loja
    const cleanStorePhone = (store.phone || '').replace(/\D/g, '');
    const cleanCustomerWhatsapp = (data.customerWhatsapp || data.customerPhone || '').replace(/\D/g, '');
    const whatsappMessage = encodeURIComponent(
      `Olá! Acabei de realizar o pedido *${orderNumber}* no site no valor de *R$ ${totalAmount.toFixed(2)}*. Nome: ${data.customerName}.`
    );
    const whatsappLink = `https://wa.me/55${cleanStorePhone || '11999999999'}?text=${whatsappMessage}`;

    return NextResponse.json({
      success: true,
      message: 'Pedido realizado com sucesso!',
      orderId: completedOrder.id,
      orderNumber: completedOrder.orderNumber,
      totalAmount: completedOrder.totalAmount,
      deliveryType: completedOrder.deliveryType,
      whatsappLink,
    });
  } catch (error: any) {
    console.error('Erro no checkout da loja online:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar pedido online.' },
      { status: 500 }
    );
  }
}
