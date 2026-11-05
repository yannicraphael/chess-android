import type { Bot } from '../bots'
import Icon from './Icon'
import './BotAvatar.css'

// Portrait of a bot: illustrated avatar, monogram for real top players, chip icon for the engine
export default function BotAvatar({ bot, size = 44, className = '' }: { bot: Bot | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.36 }
  if (!bot) return <span className={'bot-av me ' + className} style={style}><Icon name="user" /></span>
  if (bot.avatar) return <span className={'bot-av ' + className} style={style}><img src={bot.avatar} alt="" draggable={false} /></span>
  if (bot.group === 'engine') return <span className={'bot-av engine ' + className} style={style}><Icon name="cpu" /></span>
  const initials = bot.name.split(' ').filter((w) => /^[A-ZÄÖÜ]/.test(w)).map((w) => w[0]).slice(0, 2).join('')
  return <span className={'bot-av mono ' + className} style={style}>{initials}</span>
}
