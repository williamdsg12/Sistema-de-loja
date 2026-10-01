import { prisma } from './db';

interface AuditLogParams {
  storeId: string;
  userId?: string | null;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        storeId: params.storeId,
        userId: params.userId || null,
        userName: params.userName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        previousValue: params.previousValue ? JSON.stringify(params.previousValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Falha ao registrar log de auditoria:', error);
  }
}
