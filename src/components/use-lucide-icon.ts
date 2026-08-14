import { computed } from 'vue'
import arrowDownUpIcon from '../assets/icons/arrow-down-up.png'
import bellRingIcon from '../assets/icons/bell-ring.png'
import bottleWineIcon from '../assets/icons/bottle-wine.png'
import chartColumnIcon from '../assets/icons/chart-column-increasing.png'
import clockIcon from '../assets/icons/clock.png'
import fileTextIcon from '../assets/icons/file-text.png'
import imagePlusIcon from '../assets/icons/image-plus.png'
import packagePlusIcon from '../assets/icons/package-plus.png'
import packageSearchIcon from '../assets/icons/package-search.png'
import packageXIcon from '../assets/icons/package-x.png'
import pencilIcon from '../assets/icons/pencil.png'
import receiptTextIcon from '../assets/icons/receipt-text.png'
import settingsIcon from '../assets/icons/settings.png'
import shoppingBagIcon from '../assets/icons/shopping-bag.png'
import triangleAlertIcon from '../assets/icons/triangle-alert.png'
import usersRoundIcon from '../assets/icons/users-round.png'
import walletIcon from '../assets/icons/wallet.png'
import walletCardsIcon from '../assets/icons/wallet-cards.png'
import warehouseIcon from '../assets/icons/warehouse.png'
import xIcon from '../assets/icons/x.png'
import { type LucideIconName } from '../utils/lucide-icons'

const iconSources: Record<LucideIconName, string> = {
  'chart-column-increasing': chartColumnIcon,
  'receipt-text': receiptTextIcon,
  'bell-ring': bellRingIcon,
  'bottle-wine': bottleWineIcon,
  'wallet-cards': walletCardsIcon,
  'package-search': packageSearchIcon,
  'arrow-down-up': arrowDownUpIcon,
  'users-round': usersRoundIcon,
  warehouse: warehouseIcon,
  'shopping-bag': shoppingBagIcon,
  wallet: walletIcon,
  'package-plus': packagePlusIcon,
  'package-x': packageXIcon,
  'triangle-alert': triangleAlertIcon,
  clock: clockIcon,
  settings: settingsIcon,
  'file-text': fileTextIcon,
  pencil: pencilIcon,
  'image-plus': imagePlusIcon,
  x: xIcon
}

type LucideIconProps = {
  name: LucideIconName
  color: string
  size: number
  strokeWidth: number
}

export function useLucideIcon(props: LucideIconProps) {
  const src = computed(() => iconSources[props.name] || iconSources['chart-column-increasing'])
  const iconStyle = computed(() => ({
    width: `${props.size}px`,
    height: `${props.size}px`
  }))

  return { src, iconStyle }
}
