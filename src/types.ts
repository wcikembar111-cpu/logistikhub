export interface LinkData {
  id: string;
  title: string;
  url: string;
  category: string;
  subcategory?: string;
  icon?: string;
}

export interface TodoData {
  id: string;
  task: string;
  status: 'no' | 'onproses' | 'close';
}

export interface AnnouncementData {
  messages: string[];
}
