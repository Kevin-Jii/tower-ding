import { request, withGlobalLoading } from './http'

export type DashboardStats = Record<string, any>

export type BusinessCategoryAmount = {
  category_id?: number
  category_name?: string
  in_amount?: number
  out_amount?: number
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

const MAX_PAGE_SIZE = 100

export type UserProfile = {
  id: number
  phone?: string
  nickname?: string
  username?: string
  store_id?: number
  store?: {
    id: number
    name?: string
    store_code?: string
    address?: string
    administrative_unit?: string
    phone?: string
    business_hours?: string
    contact_person?: string
    status?: number
  }
  role_id?: number
  role?: { id?: number; name?: string; code?: string }
  status?: number
  created_at?: string
  updated_at?: string
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

export type InventoryLossType = 'loss' | 'self_use' | 'gift'

export type InventoryLossOrderItem = {
  id?: number
  order_id?: number
  product_id?: number
  product_name?: string
  unit?: string
  quantity?: number
  base_quantity?: number
  base_unit?: string
  cost_price?: number
  cost_amount?: number
  remark?: string
}

export type InventoryLossOrder = {
  id: number
  order_no?: string
  store_id?: number
  type?: InventoryLossType | string
  member_id?: number
  member?: Member
  reason?: string
  total_cost?: number
  item_count?: number
  operator_name?: string
  is_canceled?: boolean
  created_at?: string
  items?: InventoryLossOrderItem[]
}

export type SupplierProduct = {
  id: number
  product_id?: number
  supplier_id?: number
  category_id?: number
  category_name?: string
  category?: { id?: number; name?: string }
  product?: {
    id?: number
    name?: string
    product_name?: string
    unit?: string
    category_id?: number
    category_name?: string
    category?: { id?: number; name?: string }
  }
  product_name?: string
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
  income_amount?: number
  other_expense_amount?: number
  is_errand_order?: number
  errand_fee?: number
  round_amount?: number
  is_gift_wine?: number
  gift_wine_product_path?: Array<string | number>
  gift_wine_product_id?: number
  gift_wine_product_name?: string
  gift_wine_unit?: string
  gift_wine_quantity?: number
  gift_wine_cost_amount?: number
  net_income_amount?: number
  payment_status?: number
  member_id?: number
  order_no?: string
  account_no?: string
  item_count?: number
  tag_code?: string
  tag_name?: string
  remark?: string
  account_date?: string
  store?: { id?: number; name?: string }
  member?: Member
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
  consumables?: StoreAccountConsumable[]
  created_at?: string
}

export type StoreAccountConsumable = {
  id?: number
  account_id?: number
  product_id?: number
  product_name?: string
  quantity?: number
  unit?: string
  price?: number
  amount?: number
  remark?: string
}

export type StoreAccountConsumableProduct = {
  id: number
  store_id?: number
  name?: string
  cost_price?: number
  remark?: string
  created_at?: string
  updated_at?: string
}

export type CreateStoreAccountItemReq = {
  product_id: number
  product_name?: string
  spec?: string
  quantity: number
  unit?: string
  price?: number
  amount?: number
  remark?: string
}

export type CreateStoreAccountReq = {
  member_id?: number
  payment_status?: number
  channel: string
  order_no?: string
  tag_code?: string
  tag_name?: string
  remark?: string
  account_date?: string
  income_amount?: number
  other_expense_amount?: number
  is_errand_order?: number
  errand_fee?: number
  round_amount?: number
  is_gift_wine?: number
  gift_wine_product_path?: Array<string | number>
  gift_wine_product_id?: number
  gift_wine_unit?: string
  gift_wine_quantity?: number
  gift_wine_cost_amount?: number
  items: CreateStoreAccountItemReq[]
}

export type UpdateStoreAccountReq = {
  member_id?: number | null
  payment_status?: number
  channel?: string
  order_no?: string
  income_amount?: number
  tag_code?: string
  tag_name?: string
  remark?: string
  account_date?: string
  other_expense_amount?: number
  is_errand_order?: number
  errand_fee?: number
  round_amount?: number
  is_gift_wine?: number
  gift_wine_product_path?: Array<string | number>
  gift_wine_product_id?: number
  gift_wine_unit?: string
  gift_wine_quantity?: number
  gift_wine_cost_amount?: number
}

export type Member = {
  id: number
  store_id?: number
  uid?: string
  name?: string
  phone?: string
  balance?: string | number
  points?: number
  level?: number
  version?: number
  created_at?: string
  updated_at?: string
}

export type MemberWineStorage = {
  id: number
  store_id?: number
  member_id?: number
  member?: Member
  wine_name?: string
  unit?: string
  quantity?: number
  remark?: string
  created_at?: string
  updated_at?: string
}

export type MemberWineTransaction = {
  id: number
  store_id?: number
  storage_id?: number
  member_id?: number
  member?: Member
  type?: number
  wine_name?: string
  unit?: string
  quantity?: number
  balance_after?: number
  remark?: string
  operator_name?: string
  created_at?: string
}

export type B2BCustomer = {
  id: number
  store_id?: number
  name?: string
  customer_type?: string
  contact_person?: string
  phone?: string
  address?: string
  settlement?: string
  price_level?: string
  credit_limit?: number
  receivable?: number
  status?: number
  remark?: string
}

export type B2BPrice = {
  id: number
  store_id?: number
  customer_id?: number
  price_level?: string
  product_id?: number
  unit_spec_id?: number
  unit_name?: string
  supply_price?: number
  min_quantity?: number
  is_enabled?: boolean
  remark?: string
  customer?: B2BCustomer
  product?: { id?: number; name?: string; product_name?: string }
  unit_spec?: ProductUnitSpec
}

export type B2BSupplyOrderItem = {
  id?: number
  product_id?: number
  product_name?: string
  unit_spec_id?: number
  unit_name?: string
  factor_to_base?: number
  quantity?: number
  base_quantity?: number
  supply_price?: number
  cost_price?: number
  amount?: number
  cost_amount?: number
  profit_amount?: number
  remark?: string
}

export type B2BSupplyOrder = {
  id: number
  order_no?: string
  store_id?: number
  customer_id?: number
  customer_name?: string
  order_date?: string
  total_amount?: number
  paid_amount?: number
  unpaid_amount?: number
  cost_amount?: number
  profit_amount?: number
  payment_status?: number
  delivery_status?: number
  remark?: string
  operator_id?: number
  operator_name?: string
  created_at?: string
  updated_at?: string
  customer?: B2BCustomer
  items?: B2BSupplyOrderItem[]
}

export type StoreReturnItem = {
  id?: number
  product_id?: number
  product_name?: string
  quantity?: number
  deposit?: number
  remark?: string
}

export type StoreReturn = {
  id: number
  return_no?: string
  store_id?: number
  return_date?: string
  logistics_fee?: number
  total_deposit?: number
  item_count?: number
  remark?: string
  operator_id?: number
  operator_name?: string
  created_at?: string
  items?: StoreReturnItem[]
}

export type StoreReturnProduct = {
  id: number
  store_id?: number
  product_name?: string
  deposit?: number
  remark?: string
  status?: number
}

export type StoreReturnStats = {
  total_deposit?: number
  logistics_fee?: number
  return_count?: number
  item_count?: number
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

function unwrapList<T>(payload: T[] | PaginatedList<T> | Record<string, any> | null | undefined): T[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray((payload as PaginatedList<T>)?.list)) return (payload as PaginatedList<T>).list || []
  if (Array.isArray((payload as any)?.items)) return (payload as any).items
  if (Array.isArray((payload as any)?.rows)) return (payload as any).rows
  return []
}

async function collectPagedList<T>(
  loadPage: (params: { page: number; page_size: number }) => Promise<T[]>,
  maxPages = 50,
  showLoading = true
) {
  return withGlobalLoading(async () => {
    const rows: T[] = []
    for (let page = 1; page <= maxPages; page += 1) {
      const pageRows = await loadPage({ page, page_size: MAX_PAGE_SIZE })
      rows.push(...pageRows)
      if (pageRows.length < MAX_PAGE_SIZE) break
    }
    return rows
  }, showLoading)
}

export function getDashboardStats(authToken: string, params: { period?: string; store_id?: number }) {
  return request<DashboardStats>('/statistics/dashboard', { method: 'GET', data: params, authToken })
}

export function getUserProfile(authToken: string) {
  return request<UserProfile>('/users/profile', { method: 'GET', authToken })
}

export function getBusinessOverview(
  authToken: string,
  params: { start_date: string; end_date: string; store_id?: number }
) {
  return request<BusinessOverview>('/statistics/business-overview', { method: 'GET', data: params, authToken })
}

export function getHomeCharts(
  authToken: string,
  params: { start_date: string; end_date: string; granularity: 'day' | 'month'; store_id?: number }
) {
  return request<HomeCharts>('/statistics/home-charts', { method: 'GET', data: params, authToken })
}

export function listInventories(
  authToken: string,
  params: { store_id?: number; keyword?: string; page?: number; page_size?: number; showLoading?: boolean }
) {
  const { showLoading = true, ...data } = params
  return request<InventoryWithProduct[] | PaginatedList<InventoryWithProduct>>('/inventories', {
    method: 'GET',
    data,
    authToken,
    showLoading
  }).then(unwrapList)
}

export function listAllInventories(
  authToken: string,
  params: { store_id?: number; keyword?: string } = {}
) {
  return collectPagedList<InventoryWithProduct>((pageParams) =>
    listInventories(authToken, {
      ...params,
      ...pageParams,
      showLoading: false
    })
  )
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

export function listInventoryLossOrders(
  authToken: string,
  params: {
    store_id?: number
    type?: InventoryLossType | string
    member_id?: number
    keyword?: string
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
  } = {}
) {
  return request<InventoryLossOrder[] | PaginatedList<InventoryLossOrder>>('/inventory-loss-orders', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function createInventoryLossOrder(
  authToken: string,
  body: {
    store_id?: number
    type: InventoryLossType
    member_id?: number
    reason: string
    items: Array<{ product_id: number; unit: string; quantity: number; remark?: string }>
  }
) {
  return request<InventoryLossOrder>('/inventory-loss-orders', { method: 'POST', data: body, authToken })
}

export function getInventoryLossOrder(authToken: string, id: number) {
  return request<InventoryLossOrder>(`/inventory-loss-orders/${id}`, { method: 'GET', authToken })
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
  params: { store_id?: number; supplier_id?: number; category_id?: number; keyword?: string; page?: number; page_size?: number; showLoading?: boolean } = {}
) {
  const { showLoading = true, ...data } = params
  return request<SupplierProduct[] | PaginatedList<SupplierProduct>>('/store-suppliers/products', {
    method: 'GET',
    data,
    authToken,
    showLoading
  }).then(unwrapList)
}

export function listAllStoreSupplierProducts(
  authToken: string,
  params: { store_id?: number; supplier_id?: number; category_id?: number; keyword?: string } = {}
) {
  return collectPagedList<SupplierProduct>((pageParams) =>
    listStoreSupplierProducts(authToken, {
      ...params,
      ...pageParams,
      showLoading: false
    })
  )
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

export function listStoreAccounts(
  authToken: string,
  params: { store_id?: number; channel?: string; order_no?: string; member_keyword?: string; payment_status?: number; start_date?: string; end_date?: string; page?: number; page_size?: number }
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

export function updateStoreAccount(authToken: string, id: number, body: UpdateStoreAccountReq) {
  return request<null>(`/store-accounts/${id}`, { method: 'PUT', data: body, authToken })
}

export function getStoreAccountStats(
  authToken: string,
  params: { store_id?: number; start_date?: string; end_date?: string }
) {
  return request<{ total_amount?: number; net_income_amount?: number; count?: number }>('/store-accounts/stats', {
    method: 'GET',
    data: params,
    authToken
  })
}

export function createStoreAccount(authToken: string, body: CreateStoreAccountReq) {
  return request<StoreAccount>('/store-accounts', { method: 'POST', data: body, authToken })
}

export function bindStoreAccountConsumables(
  authToken: string,
  id: number,
  body: { consumables: Array<Record<string, unknown>> }
) {
  return request<null>(`/store-accounts/${id}/consumables`, { method: 'POST', data: body, authToken })
}

export function listStoreAccountConsumableProducts(
  authToken: string,
  params: { store_id?: number; keyword?: string; page?: number; page_size?: number; showLoading?: boolean } = {}
) {
  const { showLoading = true, ...data } = params
  return request<StoreAccountConsumableProduct[] | PaginatedList<StoreAccountConsumableProduct>>(
    '/store-accounts/consumable-products',
    { method: 'GET', data, authToken, showLoading }
  ).then(unwrapList)
}

export function listMembers(
  authToken: string,
  params: { keyword?: string; page?: number; page_size?: number } = {}
) {
  return request<Member[] | PaginatedList<Member>>('/members', {
    method: 'GET',
    data: { page: 1, page_size: 50, ...params },
    authToken
  }).then(unwrapList)
}

export function getMemberPage(
  authToken: string,
  params: { keyword?: string; page?: number; page_size?: number } = {}
) {
  return request<Member[] | PaginatedList<Member>>('/members', {
    method: 'GET',
    data: { page: 1, page_size: 50, ...params },
    authToken,
    showLoading: false
  }).then((payload) => {
    if (Array.isArray(payload)) {
      return { list: payload, total: payload.length, page: params.page || 1, page_size: params.page_size || payload.length }
    }
    return {
      list: payload?.list || [],
      total: Number(payload?.total || 0),
      page: Number(payload?.page || params.page || 1),
      page_size: Number(payload?.page_size || params.page_size || 50),
      page_num: Number(payload?.page_num || 0)
    }
  })
}

export function createMember(
  authToken: string,
  body: {
    name?: string
    phone?: string
    balance?: number
    points?: number
    level?: number
    remark?: string
    store_id?: number
  }
) {
  return request<Member>('/members', { method: 'POST', data: body, authToken })
}

export function listMemberWineStorages(
  authToken: string,
  params: { keyword?: string; member_id?: number; only_stock?: number; page?: number; page_size?: number } = {}
) {
  return request<MemberWineStorage[] | PaginatedList<MemberWineStorage>>('/member-wines', {
    method: 'GET',
    data: { page: 1, page_size: 50, only_stock: 1, ...params },
    authToken
  }).then((payload) => {
    if (Array.isArray(payload)) return { list: payload, total: payload.length, page: 1, page_size: payload.length }
    return {
      list: payload?.list || [],
      total: Number(payload?.total || 0),
      page: Number(payload?.page || params.page || 1),
      page_size: Number(payload?.page_size || params.page_size || 50)
    }
  })
}

export function depositMemberWine(
  authToken: string,
  body: { member_id: number; wine_name: string; unit?: string; quantity: number; remark?: string }
) {
  return request<MemberWineStorage>('/member-wines/deposit', { method: 'POST', data: body, authToken })
}

export function withdrawMemberWine(
  authToken: string,
  body: { member_id: number; wine_name: string; unit?: string; quantity: number; remark?: string }
) {
  return request<MemberWineStorage>('/member-wines/withdraw', { method: 'POST', data: body, authToken })
}

export function listMemberWineTransactions(
  authToken: string,
  params: { storage_id?: number; member_id?: number; type?: number; keyword?: string; start_date?: string; end_date?: string; page?: number; page_size?: number } = {}
) {
  return request<MemberWineTransaction[] | PaginatedList<MemberWineTransaction>>('/member-wines/transactions', {
    method: 'GET',
    data: { page: 1, page_size: 50, ...params },
    authToken
  }).then((payload) => {
    if (Array.isArray(payload)) return { list: payload, total: payload.length, page: 1, page_size: payload.length }
    return {
      list: payload?.list || [],
      total: Number(payload?.total || 0),
      page: Number(payload?.page || params.page || 1),
      page_size: Number(payload?.page_size || params.page_size || 50)
    }
  })
}

export function listB2BCustomers(
  authToken: string,
  params: { store_id?: number; keyword?: string; status?: number; page?: number; page_size?: number } = {}
) {
  return request<B2BCustomer[] | PaginatedList<B2BCustomer>>('/b2b/customers', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function createB2BCustomer(authToken: string, body: Record<string, unknown>) {
  return request<B2BCustomer>('/b2b/customers', { method: 'POST', data: body, authToken })
}

export function listB2BPrices(
  authToken: string,
  params: {
    store_id?: number
    customer_id?: number
    price_level?: string
    product_id?: number
    keyword?: string
    page?: number
    page_size?: number
  } = {}
) {
  return request<B2BPrice[] | PaginatedList<B2BPrice>>('/b2b/prices', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function listB2BSupplyOrders(
  authToken: string,
  params: {
    store_id?: number
    customer_id?: number
    keyword?: string
    payment_status?: number
    delivery_status?: number
    start_date?: string
    end_date?: string
    page?: number
    page_size?: number
  } = {}
) {
  return request<B2BSupplyOrder[] | PaginatedList<B2BSupplyOrder>>('/b2b/supply-orders', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function getB2BSupplyOrder(authToken: string, id: number) {
  return request<B2BSupplyOrder>(`/b2b/supply-orders/${id}`, { method: 'GET', authToken })
}

export function createB2BSupplyOrder(authToken: string, body: Record<string, unknown>) {
  return request<B2BSupplyOrder>('/b2b/supply-orders', { method: 'POST', data: body, authToken })
}

export function updateB2BSupplyOrderDeliveryStatus(authToken: string, id: number, body: { delivery_status: number }) {
  return request<B2BSupplyOrder>(`/b2b/supply-orders/${id}/delivery-status`, { method: 'PUT', data: body, authToken })
}

export function updateB2BSupplyOrderPaymentStatus(
  authToken: string,
  id: number,
  body: { payment_status: number; paid_amount?: number }
) {
  return request<B2BSupplyOrder>(`/b2b/supply-orders/${id}/payment-status`, { method: 'PUT', data: body, authToken })
}

export function listStoreReturns(
  authToken: string,
  params: { store_id?: number; keyword?: string; start_date?: string; end_date?: string; page?: number; page_size?: number } = {}
) {
  return request<StoreReturn[] | PaginatedList<StoreReturn>>('/store-returns', {
    method: 'GET',
    data: params,
    authToken
  }).then(unwrapList)
}

export function getStoreReturn(authToken: string, id: number) {
  return request<StoreReturn>(`/store-returns/${id}`, { method: 'GET', authToken })
}

export function getStoreReturnStats(
  authToken: string,
  params: { store_id?: number; start_date?: string; end_date?: string } = {}
) {
  return request<StoreReturnStats>('/store-returns/stats', { method: 'GET', data: params, authToken })
}

export function createStoreReturn(authToken: string, body: Record<string, unknown>) {
  return request<StoreReturn>('/store-returns', { method: 'POST', data: body, authToken })
}

export function listStoreReturnProducts(
  authToken: string,
  params: { store_id?: number; keyword?: string; status?: number; page?: number; page_size?: number; showLoading?: boolean } = {}
) {
  const { showLoading = true, ...data } = params
  return request<StoreReturnProduct[] | PaginatedList<StoreReturnProduct>>('/store-returns/products', {
    method: 'GET',
    data,
    authToken,
    showLoading
  }).then(unwrapList)
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
