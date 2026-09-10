import type { MapRoom } from './mapgen';
export const MODIFIER_LABELS:Record<NonNullable<MapRoom['modifier']>,string>={
  blackout:'APAGÓN',alarm:'ALARMA',waxed:'PISO ENCERADO',cameras:'CÁMARAS ACTIVAS',openVault:'BÓVEDA ABIERTA',
};