import { BroadcastCategory } from '../types';

export interface ParsedBroadcastPayload {
  sender: string;
  recipient: string;
  cleanMessage: string;
  category: BroadcastCategory;
}

/**
 * Parses a broadcast message string that may contain [Kepada: Target] tags.
 * Example: "[Kepada: Pos 1] Truk sudah sampai" -> { recipient: 'Pos 1', cleanMessage: 'Truk sudah sampai' }
 */
export function parseBroadcastPayload(rawMessage: string, defaultSender: string = 'Pos Logistik', defaultCategory: BroadcastCategory = 'info'): ParsedBroadcastPayload {
  if (!rawMessage) {
    return {
      sender: defaultSender,
      recipient: 'Semua Tim (Publik)',
      cleanMessage: '',
      category: defaultCategory
    };
  }

  let text = rawMessage.trim();
  let recipient = 'Semua Tim (Publik)';

  // Check for [Kepada: ...] or [Untuk: ...] or [To: ...] tag
  const match = text.match(/^\[(?:Kepada|Untuk|To):\s*([^\]]+)\]\s*(.*)/is);
  if (match) {
    recipient = match[1].trim();
    text = match[2].trim();
  } else if (text.startsWith('@')) {
    // Also support @Pos1 message format
    const atMatch = text.match(/^@([a-zA-Z0-9_\s-]+?)(?::|\s)(.*)/is);
    if (atMatch) {
      recipient = atMatch[1].trim();
      text = atMatch[2].trim();
    }
  }

  return {
    sender: defaultSender,
    recipient: recipient || 'Semua Tim (Publik)',
    cleanMessage: text,
    category: defaultCategory
  };
}

/**
 * Formats a message with optional recipient tag.
 */
export function formatBroadcastMessage(message: string, recipient?: string): string {
  const cleanMsg = message.trim();
  const rec = recipient?.trim();
  
  if (rec && rec !== 'Semua Tim (Publik)' && rec !== 'Semua' && rec !== 'Publik') {
    return `[Kepada: ${rec}] ${cleanMsg}`;
  }
  return cleanMsg;
}
