import { NextResponse } from 'next/server';
import { COOKIE_NAME, getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await createAuditLog({
        storeId: user.storeId,
        userId: user.userId,
        userName: user.name,
        action: 'LOGOUT',
        entity: 'User',
        entityId: user.userId,
      });
    }

    const response = NextResponse.json({ success: true, message: 'Logout realizado com sucesso.' });
    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (error) {
    console.error('Erro no logout:', error);
    const response = NextResponse.json({ success: true });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}
