import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { computed, ref } from "vue";

import {
  createB2BSupplyOrder,
  listB2BCustomers,
  listB2BPrices,
  type B2BCustomer,
  type B2BPrice,
} from "../../services/api";

import { useAuthStore } from "../../stores/auth";

export default {
  setup() {
    const auth = useAuthStore();
    const router = useRouter();

    // =========================
    // 基础状态
    // =========================

    const initialCustomerId = Number(router.params?.customer_id || 0);

    const todayDate = formatDateValue(new Date());

    const orderDate = ref(todayDate);

    const customers = ref<B2BCustomer[]>([]);
    const prices = ref<B2BPrice[]>([]);

    const customerId = ref(initialCustomerId);

    const lines = ref<any[]>([newOrderLine()]);

    const paidAmount = ref("");
    const remark = ref("");

    const saving = ref(false);

    // =========================
    // 基础方法
    // =========================

    function newOrderLine() {
      return {
        price_id: 0,
        quantity: "1",
      };
    }

    function formatDateValue(date: Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    }

    function formatMoney(value: any) {
      const number = Number(value || 0);

      return Number.isFinite(number) ? number.toFixed(2) : "0.00";
    }

    // =========================
    // 客户
    // =========================

    const customerOptions = computed(() =>
      customers.value.map((customer) => ({
        label: customer.name || `客户 #${customer.id}`,

        value: Number(customer.id),
      })),
    );

    const customerIndex = computed(() => {
      const index = customerOptions.value.findIndex(
        (item) => Number(item.value) === Number(customerId.value),
      );

      return index >= 0 ? index : 0;
    });

    const selectedCustomerLabel = computed(() => {
      return customerOptions.value[customerIndex.value]?.label || "请选择客户";
    });

    const selectedCustomer = computed(() => {
      return (
        customers.value.find(
          (customer) =>
            Number(customer.id || 0) === Number(customerId.value || 0),
        ) || null
      );
    });

    // =========================
    // 价格匹配
    //
    // 优先级：
    // 1. 客户专属价格
    // 2. 客户价格等级
    // 3. 默认价格
    // =========================

    function priceMatchesCustomer(price: B2BPrice, customer: B2BCustomer) {
      const currentCustomerId = Number(customer.id || 0);

      const priceCustomerId = Number(price.customer_id || 0);

      const customerLevel = String(customer.price_level || "").trim();

      const priceLevel = String(price.price_level || "").trim();

      // 客户专属价格
      if (priceCustomerId > 0) {
        return priceCustomerId === currentCustomerId;
      }

      // 客户有价格等级
      if (customerLevel) {
        return priceLevel === customerLevel;
      }

      // 客户没有价格等级
      // 只使用默认价格
      return !priceLevel;
    }

    /**
     * 当前客户可使用的全部价格
     */
    const customerPrices = computed(() => {
      const customer = selectedCustomer.value;

      if (!customer) {
        return [];
      }

      return prices.value.filter((price) =>
        priceMatchesCustomer(price, customer),
      );
    });

    /**
     * Picker 使用的价格列表
     */
    const priceOptions = computed(() => {
      return [...customerPrices.value].sort(comparePrices).map((price) => ({
        label: `${getProductName(price)} / ${getUnitName(
          price,
        )} / ¥${formatMoney(price.supply_price)}`,

        value: Number(price.id),
      }));
    });

    function comparePrices(a: B2BPrice, b: B2BPrice) {
      const categorySort = compareSort(getPriceCategorySort(a), getPriceCategorySort(b));
      if (categorySort) {
        return categorySort;
      }

      const categoryId = Number(a.product?.category_id || 0) - Number(b.product?.category_id || 0);
      if (categoryId) {
        return categoryId;
      }

      const name = getProductName(a).localeCompare(getProductName(b), "zh-Hans");
      if (name) {
        return name;
      }

      return Number(a.id || 0) - Number(b.id || 0);
    }

    function getPriceCategorySort(price: B2BPrice) {
      const sort = Number(price.product?.category?.sort);
      return Number.isFinite(sort) ? sort : null;
    }

    function compareSort(a: number | null, b: number | null) {
      const leftValid = a != null;
      const rightValid = b != null;
      if (!leftValid && !rightValid) return 0;
      if (!leftValid) return 1;
      if (!rightValid) return -1;
      return a - b;
    }

    function getProductName(price: B2BPrice) {
      return (
        price.product?.name ||
        price.product?.product_name ||
        `商品 #${price.product_id}`
      );
    }

    function getUnitName(price: B2BPrice) {
      return price.unit_name || price.unit_spec?.unit_name || "-";
    }

    // =========================
    // 商品价格
    // =========================

    /**
     * 根据 price_id 找到真实价格
     */
    function selectedLinePrice(line: { price_id: number }) {
      const priceId = Number(line.price_id || 0);

      if (!priceId) {
        return undefined;
      }

      return customerPrices.value.find((price) => Number(price.id) === priceId);
    }

    /**
     * price_id → Picker index
     *
     * 注意：
     * price_id 是数据库 ID
     * Picker value 是数组下标
     */
    function linePriceIndex(line: { price_id: number }) {
      const priceId = Number(line.price_id || 0);

      const index = priceOptions.value.findIndex(
        (item) => Number(item.value) === priceId,
      );

      return index >= 0 ? index : 0;
    }

    /**
     * 获取 Picker 显示文本
     */
    function linePriceLabel(line: { price_id: number }) {
      const price = selectedLinePrice(line);

      if (!price) {
        return "请选择供货价";
      }

      const option = priceOptions.value.find(
        (item) => Number(item.value) === Number(price.id),
      );

      return option?.label || "请选择供货价";
    }

    /**
     * Picker index → price_id
     */
    function onLinePriceChange(lineIdx: number, event: any) {
      const index = Number(event?.detail?.value ?? 0);

      const line = lines.value[lineIdx];

      if (!line) {
        return;
      }

      const option = priceOptions.value[index];

      if (!option) {
        line.price_id = 0;
        return;
      }

      line.price_id = Number(option.value);
    }

    // =========================
    // 客户切换
    // =========================

    function onCustomerChange(event: any) {
      const index = Number(event?.detail?.value ?? 0);

      const option = customerOptions.value[index];

      customerId.value = Number(option?.value || 0);

      // 切换客户后必须清空商品
      // 防止旧客户的 price_id
      // 继续残留
      lines.value = [newOrderLine()];
    }

    // =========================
    // 日期
    // =========================

    function onOrderDateChange(event: any) {
      orderDate.value = String(event?.detail?.value || todayDate);
    }

    // =========================
    // 数量
    // =========================

    function moneyInputValue(event: any) {
      const raw = String(event?.detail?.value || "").replace(/[^\d.]/g, "");

      if (!raw) {
        return "";
      }

      const [head, ...tail] = raw.split(".");

      if (tail.length) {
        return `${head}.${tail.join("").slice(0, 2)}`;
      }

      return head;
    }

    function onLineQtyInput(lineIdx: number, event: any) {
      const line = lines.value[lineIdx];

      if (!line) {
        return;
      }

      line.quantity = moneyInputValue(event);
    }

    // =========================
    // 已收金额
    // =========================

    function onPaidInput(event: any) {
      paidAmount.value = moneyInputValue(event);
    }

    // =========================
    // 备注
    // =========================

    function onRemarkInput(event: any) {
      remark.value = String(event?.detail?.value || "");
    }

    // =========================
    // 商品合计
    // =========================

    const orderTotalAmount = computed(() => {
      return lines.value.reduce((sum, line) => {
        const price = selectedLinePrice(line);

        const unitPrice = Number(price?.supply_price || 0);

        const quantity = Number(line.quantity || 0);

        return sum + unitPrice * quantity;
      }, 0);
    });

    // =========================
    // 商品操作
    // =========================

    function addLine() {
      lines.value.push(newOrderLine());
    }

    function removeLine(index: number) {
      if (lines.value.length <= 1) {
        return;
      }

      lines.value.splice(index, 1);
    }

    // =========================
    // 加载数据
    // =========================

    async function refresh() {
      if (!auth.token) {
        Taro.redirectTo({
          url: "/pages/login/index",
        });

        return;
      }

      try {
        const [customerList, priceList] = await Promise.all([
          listB2BCustomers(auth.token, {
            store_id: auth.storeId || undefined,

            status: 1,

            page: 1,

            page_size: 100,
          }),

          listB2BPrices(auth.token, {
            store_id: auth.storeId || undefined,

            page: 1,

            page_size: 100,
          }),
        ]);

        customers.value = customerList;

        prices.value = priceList;

        const hasSelectedCustomer = customers.value.some(
          (customer) => Number(customer.id || 0) === Number(customerId.value),
        );

        if (customers.value.length && !hasSelectedCustomer) {
          customerId.value = Number(customers.value[0]?.id || 0);

          lines.value = [newOrderLine()];
        }

        if (!customers.value.length) {
          customerId.value = 0;
          lines.value = [newOrderLine()];
        }
      } catch (error: any) {
        Taro.showToast({
          title: error?.message || "加载失败",

          icon: "none",
        });
      }
    }

    // =========================
    // 提交供货单
    // =========================

    async function submitOrder() {
      if (!auth.token || saving.value) {
        return;
      }

      // 客户
      if (!customerId.value) {
        Taro.showToast({
          title: "请选择客户",
          icon: "none",
        });

        return;
      }

      // 日期
      if (!orderDate.value) {
        Taro.showToast({
          title: "请选择供货日期",
          icon: "none",
        });

        return;
      }

      // 价格
      if (!customerPrices.value.length) {
        Taro.showToast({
          title: "该客户暂无可用供货价",

          icon: "none",
        });

        return;
      }

      const items: any[] = [];

      // 校验商品
      for (let index = 0; index < lines.value.length; index += 1) {
        const line = lines.value[index];

        const price = selectedLinePrice(line);

        if (!price) {
          Taro.showToast({
            title: `请选择商品 ${index + 1} 的供货价`,

            icon: "none",
          });

          return;
        }

        const quantity = Number(line.quantity || 0);

        if (!(quantity > 0)) {
          Taro.showToast({
            title: `请填写商品 ${index + 1} 的数量`,

            icon: "none",
          });

          return;
        }

        items.push({
          product_id: price.product_id,

          unit_spec_id: price.unit_spec_id,

          quantity,

          supply_price: price.supply_price,

          remark: "",
        });
      }

      if (!items.length) {
        Taro.showToast({
          title: "请至少添加一个商品",

          icon: "none",
        });

        return;
      }

      saving.value = true;

      try {
        await createB2BSupplyOrder(auth.token, {
          store_id: auth.storeId || undefined,

          customer_id: customerId.value,

          order_date: orderDate.value,

          paid_amount: Number(paidAmount.value || 0),

          remark: remark.value.trim(),

          items,
        });

        Taro.showToast({
          title: "已提交",
          icon: "success",
        });

        setTimeout(() => {
          Taro.navigateBack().catch(() =>
            Taro.redirectTo({
              url: "/pages/b2b/supply-orders",
            }),
          );
        }, 400);
      } catch (error: any) {
        Taro.showToast({
          title: error?.message || "保存失败",

          icon: "none",
        });
      } finally {
        saving.value = false;
      }
    }

    // =========================
    // 页面显示
    // =========================

    useDidShow(() => {
      refresh();
    });

    // =========================
    // 暴露给模板
    // =========================

    return {
      auth,
      router,

      orderDate,
      customers,
      prices,
      customerId,

      lines,
      paidAmount,
      remark,
      saving,

      customerOptions,
      customerIndex,
      selectedCustomerLabel,
      selectedCustomer,

      customerPrices,
      visiblePrices: customerPrices,
      priceOptions,

      orderTotalAmount,

      onCustomerChange,
      onOrderDateChange,

      linePriceIndex,
      selectedLinePrice,
      linePriceLabel,
      onLinePriceChange,

      onLineQtyInput,
      onPaidInput,
      onRemarkInput,

      addLine,
      removeLine,

      formatMoney,

      refresh,
      submitOrder,
    };
  },
};
