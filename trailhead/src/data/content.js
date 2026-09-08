export const problems = [
  {
    title: 'Lost Sales',
    body: 'Customers leave because they cannot find the right product or get an answer quickly.',
  },
  {
    title: 'Repetitive Support',
    body: 'Teams spend hours answering the same questions.',
  },
  {
    title: 'Missed Opportunities',
    body: 'Businesses have valuable customer and sales data but don\u2019t know what actions to take.',
  },
  {
    title: 'No Time to Analyze',
    body: 'Owners are busy running the business instead of continuously optimizing it.',
  },
  {
    title: 'Customers Don\u2019t Come Back',
    body: 'Businesses struggle to identify the right moment to bring customers back.',
  },
];

export const employees = [
  {
    key: 'sales',
    name: 'AI Sales',
    body: 'Helps customers discover products, compare options, get recommendations and make purchase decisions.',
    capabilities: ['Product discovery', 'Recommendations', 'Comparisons', 'Upselling', 'Cross-selling', 'Purchase assistance'],
  },
  {
    key: 'support',
    name: 'AI Support',
    body: 'Handles routine customer questions 24/7 while escalating complex issues when human help is needed.',
    capabilities: ['Order tracking', 'Shipping', 'Returns', 'Refunds', 'FAQs', 'Customer support'],
  },
  {
    key: 'retention',
    name: 'AI Retention',
    body: 'Helps turn one-time buyers into repeat customers.',
    capabilities: ['Reorder opportunities', 'Win-back', 'Repeat purchase', 'Customer engagement', 'Retention opportunities'],
  },
  {
    key: 'analytics',
    name: 'AI Analytics',
    body: 'Turns business data into clear answers and actionable insights.',
    capabilities: ['Revenue analysis', 'Product analysis', 'Customer insights', 'Opportunity detection', 'Business reports'],
  },
  {
    key: 'operations',
    name: 'AI Operations',
    body: 'Helps automate repetitive business operations and workflows.',
    capabilities: ['Business workflows', 'Customer actions', 'Operational tasks', 'Approvals', 'Automated processes'],
  },
];

export const opportunities = [
  {
    kind: 'Revenue Opportunity',
    title: 'Product A has high traffic but low conversion.',
    evidence: ['1,248 product views', 'Conversion: 1.8%'],
    action: 'Improve product information and recommendation strategy.',
  },
  {
    kind: 'Retention Opportunity',
    title: '84 customers may be ready for another purchase.',
    evidence: [],
    action: 'Send a timely, personalized reorder reminder.',
  },
  {
    kind: 'Cart Recovery',
    title: '38 high-intent customers abandoned their carts.',
    evidence: [],
    action: 'Potential recovered revenue: \u20b918,400',
  },
  {
    kind: 'Knowledge Gap',
    title: 'Customers repeatedly ask about delivery times.',
    evidence: [],
    action: 'Improve shipping information.',
  },
];

export const predictions = [
  {
    title: 'Customer Risk',
    body: 'This customer may be at risk of becoming inactive.',
    confidence: 'High',
  },
  {
    title: 'Purchase Prediction',
    body: 'This customer is likely to purchase again soon.',
    confidence: 'Medium',
  },
  {
    title: 'Product Demand',
    body: 'Demand for Product A is trending upward.',
    confidence: 'High',
  },
  {
    title: 'Conversion Risk',
    body: 'Product B traffic is increasing while conversion is declining.',
    confidence: 'Medium',
  },
];

export const howItWorks = [
  { step: '01', title: 'Connect', body: 'Connect your e-commerce store.' },
  { step: '02', title: 'Understand', body: 'TRAILHEAD learns about your products, customers, orders and business.' },
  { step: '03', title: 'Activate', body: 'Enable AI Employees for sales, support, retention and operations.' },
  { step: '04', title: 'Grow', body: 'TRAILHEAD identifies opportunities and helps execute actions.' },
  { step: '05', title: 'Improve', body: 'Measure results and continuously optimize.' },
];

export const useCases = [
  { title: 'Increase Sales', body: 'Help more customers find the right product.' },
  { title: 'Recover Abandoned Carts', body: 'Bring high-intent customers back.' },
  { title: 'Improve Conversion', body: 'Identify products with conversion problems.' },
  { title: 'Increase AOV', body: 'Find upsell and cross-sell opportunities.' },
  { title: 'Improve Retention', body: 'Bring customers back at the right time.' },
  { title: 'Reduce Support Work', body: 'Automate routine customer questions.' },
  { title: 'Understand Customers', body: 'Discover customer preferences and behavior.' },
  { title: 'Improve Operations', body: 'Automate repetitive business workflows.' },
];

export const differentiators = [
  { title: 'One AI Team', body: 'Multiple specialized AI Employees working together.' },
  { title: 'Business-Aware', body: 'Understands customers, products, orders and revenue.' },
  { title: 'Action-Oriented', body: 'Moves beyond answering questions.' },
  { title: 'Measurable', body: 'Connects AI activity to business outcomes.' },
  { title: 'Controlled', body: 'Permissions, approvals and auditability.' },
  { title: 'Continuously Improving', body: 'Learns from feedback, outcomes and experiments.' },
];

export const impactMetrics = [
  { label: 'Revenue', dir: 'up' },
  { label: 'Conversion', dir: 'up' },
  { label: 'AOV', dir: 'up' },
  { label: 'Repeat Purchases', dir: 'up' },
  { label: 'Support Work', dir: 'down' },
  { label: 'Cart Abandonment', dir: 'down' },
  { label: 'Customer Satisfaction', dir: 'up' },
];
