import SupportAgentIcon from '@mui/icons-material/SupportAgentOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShippingOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthOutlined';
import SearchIcon from '@mui/icons-material/SearchOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import AutorenewIcon from '@mui/icons-material/AutorenewOutlined';

// This set is for the retail/e-commerce vertical (Trailhead).
// Swap this array per business type — the engine underneath is identical.
export const cards = [
  {
    id: 'support',
    title: 'Customer Support',
    description: 'Get help with an issue, fast',
    icon: SupportAgentIcon,
    accent: 'accent',
    opening: "I'm here to help — what's going on?",
  },
  {
    id: 'orders',
    title: 'Order Tracking',
    description: 'See where your order is',
    icon: LocalShippingIcon,
    accent: 'accent',
    opening: "Sure — what's your order number or the email you used?",
  },
  {
    id: 'appointment',
    title: 'Book Appointment',
    description: 'Grab a slot that works for you',
    icon: CalendarMonthIcon,
    accent: 'accent',
    opening: 'What would you like to book, and roughly when works for you?',
  },
  {
    id: 'finder',
    title: 'Product Finder',
    description: 'Find the right fit for your budget',
    icon: SearchIcon,
    accent: 'accent',
    opening: "What are you shopping for, and what's your budget?",
  },
  {
    id: 'pricing',
    title: 'Price Breakdown',
    description: 'See exactly what you\u2019re paying',
    icon: ReceiptIcon,
    accent: 'signal',
    opening: 'Which product or order should I break down for you?',
  },
  {
    id: 'exchange',
    title: 'Exchange / Return',
    description: 'Start a return in seconds',
    icon: AutorenewIcon,
    accent: 'signal',
    opening: "What's the order number for the item you'd like to return or exchange?",
  },
];
