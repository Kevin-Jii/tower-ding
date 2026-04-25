import { request } from './http'

export type DashboardStats = Record<string, any>

export type BusinessCategoryAmount = {
  category_id?: number
  category_name?: string
  inbound_amount?: number
  outbound_amount?: number
  net_amount?: number
}

export type BusinessOverview = {
  inbound_amount?: number
  outbound_amount?: number
  all_category_amount?: number
  sales_amount?: number
  other_expense_amount?: number
  gross_profit_amount?: number
  net_profit_amount?: number
  sales_order_count?: number
  inventory_in_count?: number
  inventory_out_count?: number
  categories?: BusinessCategoryAmount[]
}

export type HomeChartLinePoint = {
  date?: string
  amount?: number
  orders?: number
}

export type HomeChartPieItem = {
  channel?: string
  channel_name?: string
  amount?: number
  orders?: number
  percent?: number
}

export type HomeChartRadarItem = {
  name?: string
  value?: number
}

export type HomeCharts = {
  start_date?: string
  end_date?: string
  line?: HomeChartLinePoint[]
  pie?: HomeChartPieItem[]
  radar?: HomeChartRadarItem[]
  overview?: BusinessOverview
}

type PaginatedList<T> = {
  list?: T[]
  total?: number
  page?: number
  page_size?: number
  page_num?: number
}

export type PurchaseOrder = {
  id: number
  order_no?: string
  supplier_name?: string
  supplier_id?: number
  status?: number | string
  total_amount?: number
  remark?: string
  order_date?: string
  created_by?: number
  created_at?: string
  updated_at?: string
  store?: { id?: number; name?: string }
  creator?: { id?: number; nickname?: string; username?: string; phone?: string }
  items?: Array<{
    id: number
    supplier_id?: number
    quantity?: number
    unit_price?: number
    amount?: number
    remark?: string
    supplier?: { id?: number; supplier_name?: string }
    product?: { id?: number; name?: string; unit?: string; price?: number }
  }>
}

/** 与 tower-go model.InventoryWithProduct 一致 */
export type InventoryWithProduct = {
  id: number
  store_id?: number
  store_name?: string
  product_id?: number
  product_name?: string
  quantity?: number
  unit?: string
}

/** tower-go model.InventoryStats */
export type InventoryStats = {
  total_products?: number
  total_quantity?: number
  total_records?: number
  today_in?: number
  today_out?: number
}

export type InventoryOrderItem = {
  id?: number
  product_id?: number
  product_name?: string
  quantity?: number
  unit?: string
  production_date?: string
  expiry_date?: string
  remark?: string
}

export type InventoryOrder = {
  id: number
  order_no?: string
  type?: number
  store_id?: number
  store_name?: string
  reason?: string
  remark?: string
  total_quantity?: number
  item_count?: number
  operator_name?: string
  operator_phone?: string
  created_at?: string
  items?: InventoryOrderItem[]
}

export type SupplierProduct = {
  id: number
  supplier_id?: number
  name?: string
  unit?: string
  price?: number
  bottle_price?: number
  case_price?: number
  spec?: string
  status?: number
}

export type ProductUnitSpec = {
  id?: number
  product_id?: number
  unit_code?: string
  unit_name?: string
  factor_to_base?: number
  precision?: number
  cost_price?: number
  sale_price?: number
  is_enabled?: boolean
}

export type StoreAccount = {
  id: number
  title?: string
  channel?: string
  amount?: number
  total_amount?: number
  other_expense_amount?: number
  net_income_amount?: number
  order_no?: string
  account_no?: string
  item_count?: number
  tag_code?: string
  tag_name?: string
  remark?: string
  account_date?: string
  store?: { id?: number; name?: string }
  operator?: { id?: number; nickname?: string; username?: string; phone?: string }
  items?: Array<{
    id: number
    product_id?: number
    product_name?: string
    spec?: string
    quantity?: number
    unit?: string
    price?: number
    amount?: number
    remark?: string
  }>
  created_at?: string
}

export type CreateStoreAccountItemReq = {
  product_id: number
  spec?: string
  quantity: number
  unit?: string
  price?: number
  amount?: number
  remark?: string
}

export type CreateStoreAccountReq = {
  channel: string
  order_no?: string
  tag_code?: string
  tag_name?: string
  remark?: string
  account_date?: string
  other_expense_amount?: number
  items: CreateStoreAccountItemReq[]
}

export type CreateInventoryOrderItemReq = {
  product_id: number
  quantity: number
  production_date?: string
  expiry_date?: string
  remark?: string
}

export type CreateInventoryOrderReq = {
  type: number
  reason: string
  remark?: string
  items: CreateInventoryOrderItemReq[]
}

export type SupplierGroupedItems = {
  supplier_id: number
  supplier_name?: string
  sub_total?: number
  items?: Array<{
    id: number
    product_id?: number
    product_name?: string
    unit?: string
    quantity?: number
    unit_price?: number
    amount?: number
    remark?: string
  }>
}

function unwrapList<T>(payload: T[] | PaginatedList<T> | Record<string, any> | null | undefined): T[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray((payload as PaginatedList<T>)?.list)) return (payload as PaginatedList<T>).list || []
  if (Array.isArray((payload as any)?.items)) return (payload as any).items
  if (Array.isArray((payload as any)?.rows)) return (payload as any).rows
  return []
}

export function getDashboardStats(authToken: string, params: { period?: string; store_id?: number }) {
  return request<DashboardStats>('/statistics/dashboard', { method: 'GET', data: params, authToken })
}

export function getBusinessOverview(
  authToken: string,
  params: { start_date: string; end_date: string; store_id?: number }
) {
  return request<BusinessOverview>('/statistics/business-overview', { method: 'GET', data: params, authToken })
}

export function getHomeCharts(
  authToken: string,
  params: { start_date: string; end_date: string; granularity: 'day' | 'week' | 'month'; store_id?: number }
) {
  return request<HomeCharts>('/statistics/home-charts', { method: 'GET', data: params, authToken })
}

export function listInventories(
  authToken: string,
  params: { store_id?: number; keyword?: string; page?: number; page_size?: number }
) {
  return request<InventoryWithProduct[] | PaginatedList<InventoryWithProduct>>('/inventories', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function getInventoryStats(authToken: string, params: { store_id?: number }) {
  return request<InventoryStats>('/statistics/inventory', { method: 'GET', data: params, authToken })
}

export function listInventoryOrders(
  authToken: string,
  params: { store_id?: number; type?: number; order_no?: string; date?: string; page?: number; page_size?: number }
) {
  return request<InventoryOrder[] | PaginatedList<InventoryOrder>>('/inventory-orders', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function getInventoryOrder(authToken: string, id: number) {
  return request<InventoryOrder>(`/inventory-orders/${id}`, { method: 'GET', authToken })
}

export function createInventoryOrder(authToken: string, body: CreateInventoryOrderReq) {
  return request<InventoryOrder>('/inventory-orders', { method: 'POST', data: body, authToken })
}

/** 全平台供应商商品（管理端）；门店小程序选品请用 {@link listStoreSupplierProducts} */
export function listSupplierProducts(
  authToken: string,
  params: { supplier_id?: number; category_id?: number; keyword?: string; status?: number; page?: number; page_size?: number }
) {
  return request<SupplierProduct[] | PaginatedList<SupplierProduct>>('/supplier-products', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

/**
 * 当前门店已绑定供应商下的可采商品（tower-go `GET /store-suppliers/products`）。
 * 服务端从 token 取门店；管理员可传 `store_id` 查看其他门店。
 */
export function listStoreSupplierProducts(
  authToken: string,
  params: { store_id?: number; supplier_id?: number; category_id?: number; keyword?: string } = {}
) {
  return request<SupplierProduct[] | PaginatedList<SupplierProduct>>('/store-suppliers/products', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

/** 更新商品基础单位与价格（门店侧用于维护 bottle/case） */
export function updateSupplierProduct(
  authToken: string,
  id: number,
  body: { unit?: string; bottle_price?: number; case_price?: number; spec?: string }
) {
  return request<null>(`/supplier-products/${id}`, { method: 'PUT', data: body, authToken })
}

export function listProductUnitSpecs(authToken: string, productId: number) {
  return request<ProductUnitSpec[] | PaginatedList<ProductUnitSpec>>('/product-unit-specs', {
    method: 'GET',
    data: { product_id: productId },
    authToken
  }).then(unwrapList)
}

export function batchUpsertProductUnitSpecs(
  authToken: string,
  body: { product_id: number; units: Array<Omit<ProductUnitSpec, 'id' | 'product_id'>> }
) {
  return request<null>('/product-unit-specs/batch', { method: 'POST', data: body, authToken })
}

export type DictOption = { label: string; value: string }

/** 单位字典（优先新接口 /dict/data，回退旧接口 /dict-data） */
export async function listDictOptionsByTypeCode(authToken: string, typeCode: string) {
  const toOptions = (rows: Array<any>) =>
    rows
      .map((r) => ({
        label: String(r?.label || r?.name || r?.value || '').trim(),
        value: String(r?.value || '').trim()
      }))
      .filter((o) => o.label && o.value)
  try {
    const rows = await request<Array<any>>('/dict/data', {
      method: 'GET',
      data: { type_code: typeCode },
      authToken
    })
    return toOptions(rows)
  } catch {
    const rows = await request<Array<any>>('/dict-data', {
      method: 'GET',
      data: { type_code: typeCode },
      authToken
    })
    return toOptions(rows)
  }
}

/** tower-go model.Supplier（用于绑定选品） */
export type Supplier = {
  id: number
  supplier_code?: string
  supplier_name?: string
  contact_person?: string
  contact_phone?: string
  status?: number
}

/** 门店-供应商绑定（含嵌套 supplier） */
export type StoreSupplierBinding = {
  id?: number
  store_id?: number
  supplier_id?: number
  status?: number
  supplier?: Supplier
}

/** 当前门店已绑定的供应商 `GET /store-suppliers` */
export function listStoreBoundSuppliers(authToken: string, params?: { store_id?: number }) {
  return request<StoreSupplierBinding[] | PaginatedList<StoreSupplierBinding> | Record<string, unknown>>(
    '/store-suppliers',
    {
      method: 'GET',
      data: params || {},
      authToken
    }
  ).then((payload) => {
    if (Array.isArray(payload)) return payload as StoreSupplierBinding[]
    return unwrapList(payload as PaginatedList<StoreSupplierBinding>)
  })
}

/** `POST /store-suppliers` body: store_id + supplier_ids */
export function bindStoreSuppliers(authToken: string, body: { store_id: number; supplier_ids: number[] }) {
  return request<null>('/store-suppliers', { method: 'POST', data: body, authToken })
}

/** `DELETE /store-suppliers` body: store_id + supplier_ids */
export function unbindStoreSuppliers(authToken: string, body: { store_id: number; supplier_ids: number[] }) {
  return request<null>('/store-suppliers', { method: 'DELETE', data: body, authToken })
}

/** 全量供应商目录 `GET /suppliers`（用于搜索后绑定到门店） */
export function listSuppliers(
  authToken: string,
  params: { keyword?: string; status?: number; page?: number; page_size?: number } = {}
) {
  return request<Supplier[] | PaginatedList<Supplier>>('/suppliers', {
    method: 'GET',
    data: {
      page: 1,
      page_size: 50,
      status: 1,
      ...params
    },
    authToken
  }).then(unwrapList)
}

export function listPurchaseOrders(
  authToken: string,
  params: { store_id?: number; supplier_id?: number; status?: number; date?: string; page?: number; page_size?: number }
) {
  return request<PurchaseOrder[] | PaginatedList<PurchaseOrder>>('/purchase-orders', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function getPurchaseOrderDetail(authToken: string, id: number) {
  return request<PurchaseOrder>(`/purchase-orders/${id}`, { method: 'GET', authToken })
}

export function getPurchaseOrderSupplierGroups(authToken: string, id: number) {
  return request<SupplierGroupedItems[]>(`/purchase-orders/${id}/by-supplier`, { method: 'GET', authToken })
}

export function getPurchaseOrderActions(authToken: string, id: number) {
  return request<string[]>(`/purchase-orders/${id}/actions`, { method: 'GET', authToken })
}

export function confirmPurchaseOrder(authToken: string, id: number) {
  return request<null>(`/purchase-orders/${id}/confirm`, { method: 'POST', authToken })
}

export function completePurchaseOrder(authToken: string, id: number) {
  return request<null>(`/purchase-orders/${id}/complete`, { method: 'POST', authToken })
}

export function cancelPurchaseOrder(authToken: string, id: number, reason?: string) {
  return request<null>(`/purchase-orders/${id}/cancel`, {
    method: 'POST',
    data: reason ? { reason } : {},
    authToken
  })
}

export function listStoreAccounts(
  authToken: string,
  params: { store_id?: number; channel?: string; order_no?: string; start_date?: string; end_date?: string; page?: number; page_size?: number }
) {
  return request<StoreAccount[] | PaginatedList<StoreAccount>>('/store-accounts', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function getStoreAccountDetail(authToken: string, id: number) {
  return request<StoreAccount>(`/store-accounts/${id}`, { method: 'GET', authToken })
}

export function getStoreAccountStats(
  authToken: string,
  params: { store_id?: number; start_date?: string; end_date?: string }
) {
  return request<{ total_amount?: number; count?: number }>('/store-accounts/stats', {
    method: 'GET',
    data: params,
    authToken
  })
}

export function createStoreAccount(authToken: string, body: CreateStoreAccountReq) {
  return request<StoreAccount>('/store-accounts', { method: 'POST', data: body, authToken })
}

/** tower-go model.DictData；门店端用于下拉/标签选择 */
export type DictData = {
  id?: number
  type_id?: number
  type_code?: string
  label?: string
  value?: string
  sort?: number
  is_default?: boolean
  status?: number
}

/** GET /dict-data?type_code=… 需登录；与后台 dict_types.code 对应 */
export function listDictDataByTypeCode(authToken: string, typeCode: string) {
  return request<DictData[]>('/dict-data', {
    method: 'GET',
    data: { type_code: typeCode },
    authToken
  })
}
