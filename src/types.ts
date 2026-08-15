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

export interface BroadcastMessage {
  id: string;
  sender_name: string;
  message: string;
  category: BroadcastCategory;
  device_info?: string;
  created_at: string;
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
