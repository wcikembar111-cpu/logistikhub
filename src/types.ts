export interface LinkData {
  id: string;
  title: string;
  url: string;
  category: string;
  subcategory?: string;
  icon?: string;
}

export type TodoPriority = 'rendah' | 'sedang' | 'tinggi' | 'mendesak';

export type BroadcastCategory = 'info' | 'urgent' | 'warning' | 'announcement';

export type BroadcastSyncTarget = 'both' | 'primary' | 'external';

export interface ExternalSupabaseConfig {
  url: string;
  anonKey: string;
  syncTarget: BroadcastSyncTarget;
  enabled: boolean;
}

export interface DatabaseSyncStatus {
  isPrimaryConnected: boolean;
  isExternalConnected: boolean;
  lastSyncedAt?: string;
  externalError?: string | null;
}

export interface BroadcastMessage {
  id: string;
  sender_name: string;
  message: string;
  category: BroadcastCategory;
  device_info?: string;
  created_at: string;
  origin?: 'primary' | 'external' | 'dual';
}

export interface TodoData {
  id: string;
  task: string;
  status: 'no' | 'onproses' | 'close';
  priority?: TodoPriority;
  is_blinking?: boolean;
}

export interface ParsedTodoTask {
  cleanTask: string;
  priority: TodoPriority;
  isBlinking: boolean;
}

export function parseTodoTask(rawTask: string, rawPriority?: string, rawBlinking?: boolean): ParsedTodoTask {
  let task = rawTask || '';
  let priority: TodoPriority = 'rendah';
  let isBlinking = false;

  // Check explicit properties first if present
  if (rawPriority && ['rendah', 'sedang', 'tinggi', 'mendesak'].includes(rawPriority)) {
    priority = rawPriority as TodoPriority;
  }
  if (rawBlinking !== undefined) {
    isBlinking = !!rawBlinking;
  }

  // Parse [P:tinggi], [P:mendesak], [BLINK] tags in task string
  const pMatch = task.match(/\[P:(rendah|sedang|tinggi|mendesak)\]/i);
  if (pMatch) {
    priority = pMatch[1].toLowerCase() as TodoPriority;
    task = task.replace(pMatch[0], '');
  }

  if (/\[BLINK\]/i.test(task) || /\[BLINK:true\]/i.test(task)) {
    isBlinking = true;
    task = task.replace(/\[BLINK(:true)?\]/gi, '');
  } else if (/\[BLINK:false\]/i.test(task)) {
    isBlinking = false;
    task = task.replace(/\[BLINK:false\]/gi, '');
  }

  // If priority is mendesak and blinking wasn't explicitly disabled, default blinking to true
  if (priority === 'mendesak' && rawBlinking === undefined && !rawTask.includes('[BLINK:false]')) {
    isBlinking = true;
  }

  return {
    cleanTask: task.trim(),
    priority,
    isBlinking
  };
}

export function formatTodoTask(cleanTask: string, priority: TodoPriority, isBlinking: boolean): string {
  let result = cleanTask.trim();
  if (priority && priority !== 'rendah') {
    result = `[P:${priority}] ${result}`;
  }
  if (isBlinking) {
    result = `[BLINK] ${result}`;
  }
  return result;
}

export interface QrLabelItem {
  id: string;
  itemCode: string;
  itemName: string;
  lpn: string;
  batch: string;
  ed: string;
  dataUrl?: string;
  createdAt: number;
}

export type LabelPresetSize = '100x80' | '80x100' | '50x30' | '70x50' | '100x150';

export interface ReturInventoryItem {
  id?: string;
  created_at?: string;
  no?: number | string;
  item_code?: string;
  item_name?: string;
  category?: string;
  location?: string;
  location_type?: string;
  first_qty?: number;
  last_qty_pcs?: number;
  uom?: string;
  qty_convert_ctn?: number;
  uom_convert?: string;
  lpn_serial?: string;
  batch?: string;
  vendor_batch?: string;
  sloc?: string;
  expired?: string;
  destination_code?: string;
  qc_code?: string;
  user_tally?: string;
  shelf_life?: string;
  source?: string;
  by_ed?: string;
  no_pengajuan?: string;
  tgl_pengajuan?: string;
  customer_distributor?: string;
  sku_code?: string;
  material_desc?: string;
  batch_number?: string;
  alasan_retur?: string;
  status?: string;
}

export type LogisticsTab = 
  | 'ed-checker' 
  | 'stock-opname' 
  | 'sn-generator' 
  | 'batch-checker' 
  | 'promosi' 
  | 'surat-jalan' 
  | 'retur-inventory' 
  | 'monitoring-pemusnahan'
  | 'data-pemusnahan'
  | 'outbound-lrg';

export type MainToolTab = 'qr-generator' | LogisticsTab;

export interface OutboundLrgSourceItem {
  item_code?: string;
  item_name?: string;
  category?: string;
  location?: string;
  location_type?: string;
  first_qty?: number;
  last_qty?: number;
  uom?: string;
  qty_convert?: number;
  uom_convert?: string;
  lpn_serial?: string;
  batch?: string;
  vendor_batch?: string;
  sloc?: string;
  expired_date?: string;
  destination_code?: string;
  qc_code?: string;
  user_tally?: string;
  shelf_life?: string;
  source?: string;
}

export interface OutboundLrgTemplateRow {
  id: string;
  no_document: string;
  date: string;
  delivery_date: string;
  type: string;
  destination: string;
  shipping_note: string;
  material_id: string;
  qty: number | string;
  warehouse: string;
  to_plant: string;
  to_sloc: string;
  from_sloc: string;
  cost_center: string;
  uom_convert: string;
  // Extra reference attributes
  item_name?: string;
  batch?: string;
  lpn?: string;
  expired_date?: string;
}

export interface DataPemusnahanItem {
  id: string;
  id_pemusnahan: string;
  item_code: string;
  nama_barang: string;
  kategori: string;
  lokasi: string;
  tipe_lokasi: string;
  qty_awal: number;
  qty_akhir: number;
  uom: string;
  qty_convert: number;
  uom_convert: string;
  lpn_sn: string;
  batch: string;
  vendor_batch: string;
  sloc: string;
  expired_date: string;
  kode_tujuan: string;
  status_qc: string;
  user_tally: string;
  shelf_life: string;
  sumber: string;
  tujuan: string;
  user_input: string;
  status: string;
  catatan: string;
  created_at?: string;
  updated_at?: string;
}

export interface MonitoringPemusnahanItem {
  id: string;
  tahun: number;
  bulan_pengajuan: string;
  qty_pcs: number;
  value: number;
  cogs: number;
  sloc: string;
  location: string;
  kategori: string;
  no_persetujuan: string;
  no_pengajuan: string;
  no_penolakan_qa: string;
  approved_head_log: string;
  approved_ho_direksi: string;
  serah_terima_gudang_reject: string;
  acc_teams_bap: string;
  kirim_dokumen_bap_ke_ho: 'OPEN' | 'CLOSE' | string;
  musnah_sistem_z87: string;
  completed_approval: 'OPEN' | 'CLOSE' | string;
  completed_ba: 'OPEN' | 'CLOSE' | string;
  completed_migo: 'OPEN' | 'CLOSE' | string;
  sj_kapsul: string;
  bap_kapsul: string;
  check_kapsul: 'OPEN' | 'CLOSE' | string;
  keterangan: string;
  status: 'SELESAI' | 'PROSES';
  last_update?: string;
  created_at?: string;
}

export interface UserPermissions {
  canInputIncoming: boolean;
  canTally: boolean;
  canEditMasterBarang: boolean;
  canManageUsers: boolean;
  canApproveQC: boolean;
  canAccessDatabase: boolean;
}

export type UserRole = 'Admin' | 'Pelaksana' | string;
export type UserStatus = 'Aktif' | 'Nonaktif' | string;

export interface UserSession {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  email_google: string;
  permissions: UserPermissions;
  loggedInAt?: number;
}

export interface UserRecord {
  id: string;
  username: string;
  nama: string;
  pin: string;
  avatar?: string;
  role: 'Admin' | 'Pelaksana';
  status: 'Aktif' | 'Nonaktif';
  email_google?: string;
  permissions: UserPermissions;
  created_at?: string;
  updated_at?: string;
}

export interface AuthLoginResult {
  success: boolean;
  user?: UserSession;
  message: string;
}

export interface AdminUser {
  id?: string;
  username: string;
  pin?: string;
  password?: string;
  nama_lengkap?: string;
  nama?: string;
  email?: string;
  email_google?: string;
  role?: string;
  status?: string;
  is_active?: boolean;
  avatar?: string;
  permissions?: UserPermissions;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSessionUser {
  id?: string;
  username: string;
  nama?: string;
  nama_lengkap?: string;
  email?: string;
  email_google?: string;
  role: string;
  status?: string;
  avatar?: string;
  permissions?: UserPermissions;
  loggedInAt?: number;
}



