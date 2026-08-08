import { useState } from 'react'
import { useTimesheet, type SLChat } from '../state/timesheet'
import { chatReplied } from '../chaos/slEngine'
import { CHAT_NVM } from '../content/strategylens'

/**
 * MessengerLens™: colleagues who say hello and nothing else, ever.
 * Replying is optional. So is their follow-up. (There is no follow-up.)
 */
function ChatWindow({ chat }: { chat: SLChat }) {
  const replyChat = useTimesheet(s => s.replyChat)
  const removeChat = useTimesheet(s => s.removeChat)
  const [draft, setDraft] = useState('')
  const [minimized, setMinimized] = useState(false)

  const status = chat.state === 'pinged' || chat.state === 'replied' ? '🟢 Online' : '🌙 Away'
  const nvm = chat.state === 'nvm' ? CHAT_NVM[chat.id % CHAT_NVM.length] : null

  const send = () => {
    const text = draft.trim()
    if (!text || chat.state !== 'pinged') return
    replyChat(chat.id, text)
    chatReplied(chat.id)
    setDraft('')
  }

  if (minimized) {
    return (
      <button className="chat-min" onClick={() => setMinimized(false)}>
        💬 {chat.senderName.split(' ')[0]}{chat.state === 'pinged' ? ' •' : ''}
      </button>
    )
  }

  return (
    <div className="chat-window">
      <div className="chat-title">
        <span>💬 {chat.senderName} — {status}</span>
        <span className="chat-title-btns">
          <button onClick={() => setMinimized(true)} aria-label="Minimize chat">▁</button>
          <button onClick={() => removeChat(chat.id)} aria-label="Close chat">✕</button>
        </span>
      </div>
      <div className="chat-sub">{chat.senderTitle}</div>
      <div className="chat-log">
        <div className="chat-them"><b>{chat.senderName.split(' ')[0]}:</b> {chat.text}</div>
        {chat.playerReply && <div className="chat-me"><b>You:</b> {chat.playerReply}</div>}
        {(chat.state === 'away' || chat.state === 'nvm') && (
          <div className="chat-sys">{chat.senderName} is Away and will not be back.</div>
        )}
        {nvm && <div className="chat-them"><b>{chat.senderName.split(' ')[0]}:</b> {nvm}</div>}
        {chat.state === 'replied' && <div className="chat-sys chat-typing">{chat.senderName.split(' ')[0]} is typing…</div>}
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder={chat.state === 'pinged' ? 'Reply (or don’t — there is no penalty)' : 'They cannot hear you now.'}
          disabled={chat.state !== 'pinged'}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button disabled={chat.state !== 'pinged'} onClick={send}>Send</button>
      </div>
    </div>
  )
}

export default function ChatDock() {
  const chats = useTimesheet(s => s.chats)
  if (chats.length === 0) return null
  return (
    <div className="chat-dock">
      {chats.slice(-3).map(c => <ChatWindow key={c.id} chat={c} />)}
    </div>
  )
}
