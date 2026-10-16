const outlets = [{id:'1',name:'Glowy Central Salon',status:'active',is_active:true,monthly_budget:5000}];
const service = {id:'1',service_name:'Signature Hair Treatment and Styling',price:120,duration:60,category_id:'1',status:'active',product_linkages:[],assigned_outlet_ids:['1']};
const product = {id:'1',item_name:'Professional Nourishing Shampoo 500ml',unit_price:35,central_stock:20,opening_stock:20,status:'active',unit_master_id:'1',is_stockable:true};
const customer = {id:'1',name:'Alexandra Tablet Preview',phone:'0123456789',email:'alexandra@example.test',total_spent:1200,visit_count:12,store_credit:50,loyalty_points:120};
const catalog = Array.from({length:24},(_,i)=>({id:String(i+1),name:`Signature Treatment ${i+1}`,type:'service',price:120+i,duration:60,stock:20}));
export function tabletFixture(url) {
 const p=new URL(url).pathname.replace(/^\/api/,'');
 if (p==='/services/1') return service;
 if (p==='/products/1') return product;
 if (p==='/packages/1') return {id:'1',packageName:'Signature Salon Package',packageCode:'PKG-001',price:240,totalOriginalPrice:300,savings:60,totalDuration:120,status:'active',assignedOutletNames:['Glowy Central Salon'],assignedOutletIds:['1'],saleChannels:['POS'],serviceItems:[]};
 if (p==='/staff/1') return {id:'1',name:'Alexandra Preview',firstName:'Alexandra',lastName:'Preview',phone:'0123456789',personalEmail:'staff@example.test',role:'Stylist',assignedOutletName:'Glowy Central Salon',baseSalary:2500,status:'active',address:{},bankDetails:{}};
 if (p==='/pos/bills/1') return {id:'1',billNumber:'GLOWY-001',createdAt:'2026-10-16T10:00:00Z',customer,outletName:'Glowy Central Salon',status:'paid',paymentMethod:'Cash',lineItems:[{id:'1',itemName:'Signature Treatment',itemType:'service',quantity:1,unitPrice:120,total:120}],payments:[],subtotal:120,tax:9.6,total:129.6,discountAmount:0};
 if (p==='/outlets') return outlets;
 if (p==='/services') return [service];
 if (p==='/service-categories') return [{id:'1',name:'Hair',category_name:'Hair',status:'active'}];
 if (p==='/products') return [product];
 if (p==='/unit-masters') return [{id:'1',name:'Piece',unit_name:'Piece',symbol:'pc',status:'active'}];
 if (p==='/customers') return {customers:[customer]};
 if (p==='/notifications') return {notifications:[],unreadCount:0};
 if (p==='/dashboard/summary') return {metrics:{activeOutlets:1,staffCount:12,serviceCount:24,packageCount:6,totalBudget:5000},summary:{totalRevenue:12345,totalServices:123,avgBillValue:120,totalExpenses:1500},revenueChart:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=>({day,revenue:100+i*100})),todayOrders:{orders:[],totalOrders:0,totalRevenue:0},servicePerformance:[],staffPerformance:[],packageSales:[]};
 if (p==='/pos/catalog') return catalog;
 if (p==='/pos-shifts/terminals') return {success:true,terminals:[{id:1,name:'Front Desk',outlet_id:'1',is_active:true}]};
 if (p==='/pos-shifts/shifts/active') return {success:true,shift:{id:1,status:'OPEN',terminal_id:1,opening_cash:100,opened_at:new Date().toISOString()}};
 if (p==='/pos-shifts/shifts') return {success:true,shifts:[]};
 if (p==='/vouchers') return {vouchers:[],stats:{total:0,active:0,inactive:0,redeemed:0,expired:0}};
 if (p==='/vouchers/redemptions') return {redemptions:[],stats:{count:0,discount:0,sales:0}};
 if (p==='/appointments') return [];
 if (p==='/attendance/summary') return {};
 if (p==='/budgets/summary') return {total_monthly_budget:5000,total_expenses_so_far:1000,remaining_balance:4000,spend_percentage:20,outlets:[]};
 if (p.includes('/financial-summary')) return {summary:{},transactions:[],expenses:[],payments:[],sales:[]};
 if (p==='/printer/status') return {connected:false};
 if (p==='/business-settings') return {};
 if (p==='/whatsapp/status') return {connected:false};
 if (p==='/rewards/settings') return {};
 return [];
}

// Requests are intercepted; this suite never reads or writes real business data.
export async function mockTabletSession(context, authenticated = true) {
  await context.addInitScript(authenticated => localStorage.setItem('glowy-auth', JSON.stringify({
    state: { isAuthenticated: authenticated, pendingEmail: 'tablet@example.test', user: { id: 'tablet-preview', name: 'Tablet Preview',
      email: 'tablet@example.test', role: 'admin', token: 'mock', outlet_id: '1' } }, version: 0,
  })), authenticated);
  await context.route('**/api/**', route => route.fulfill({ json: tabletFixture(route.request().url()) }));
  await context.route('**/socket.io/**', route => route.abort());
}
