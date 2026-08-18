import Taro, { useDidShow, usePullDownRefresh } from "@tarojs/taro";

import { ref } from "vue";

import {
  listB2BCustomers,
  listB2BPrices,
  type B2BCustomer,
  type B2BPrice,
} from "../../services/api";

import { useAuthStore } from "../../stores/auth";
import { log } from "console";

export default {
  setup() {
    const auth = useAuthStore();

    const customers = ref<B2BCustomer[]>([]);

    const activeCustomer = ref<B2BCustomer | null>(null);

    const activePrices = ref<B2BPrice[]>([]);

    const loading = ref(false);

    const priceLoading = ref(false);

    const priceDialogOpen = ref(false);

    function formatMoney(v: any) {
      const n = Number(v || 0);
      return Number.isFinite(n) ? n.toFixed(2) : "0.00";
    }

    function productName(row: B2BPrice) {
      return (
        row.product?.name ||
        row.product?.product_name ||
        `商品 #${row.product_id}`
      );
    }

    function priceMatchesCustomer(price: B2BPrice, customer: B2BCustomer) {
      const customerId = Number(customer.id || 0);
      const priceCustomerId = Number(price.customer_id || 0);

      const customerLevel = String(customer.price_level || "").trim();
      const priceLevel = String(price.price_level || "").trim();

      // 1. 有客户专属价，只匹配指定客户
      if (priceCustomerId > 0) {
        return priceCustomerId === customerId;
      }

      // 2. 没有客户等级，不匹配等级价格
      if (!customerLevel) {
        return false;
      }

      // 3. 按价格等级匹配
      return priceLevel === customerLevel;
    }

    async function refresh() {
      if (!auth.token) {
        Taro.redirectTo({ url: "/pages/login/index" });
        return;
      }
      loading.value = true;
      try {
        customers.value = await listB2BCustomers(auth.token, {
          store_id: auth.storeId || undefined,
          status: 1,
          page: 1,
          page_size: 100,
        });
      } catch (err: any) {
        customers.value = [];
        Taro.showToast({ title: err?.message || "加载客户失败", icon: "none" });
      } finally {
        loading.value = false;
      }
    }

    async function openPriceDialog(customer: B2BCustomer) {
      if (!auth.token) return;
      activeCustomer.value = customer;
      activePrices.value = [];
      priceDialogOpen.value = true;
      priceLoading.value = true;
      try {
        const rows = await listB2BPrices(auth.token, {
          store_id: auth.storeId || undefined,
          page: 1,
          page_size: 100,
        });
        activePrices.value = rows.filter((item) =>
          priceMatchesCustomer(item, customer),
        );
      } catch (err: any) {
        Taro.showToast({
          title: err?.message || "加载供货价失败",
          icon: "none",
        });
      } finally {
        priceLoading.value = false;
      }
    }

    function closePriceDialog() {
      priceDialogOpen.value = false;
    }

    function openCreate(customer: B2BCustomer) {
      Taro.navigateTo({
        url: `/pages/b2b/supply-order-form?customer_id=${customer.id}`,
      });
    }

    function openCustomerOrders(customer: B2BCustomer) {
      Taro.navigateTo({
        url: `/pages/b2b/supply-order-list?customer_id=${customer.id}&customer_name=${encodeURIComponent(customer.name || "")}`,
      });
    }

    function noopTouchMove() {}

    useDidShow(() => refresh());

    usePullDownRefresh(async () => {
      await refresh();
      Taro.stopPullDownRefresh();
    });

    return {
      Taro,
      useDidShow,
      usePullDownRefresh,
      ref,
      listB2BCustomers,
      listB2BPrices,
      useAuthStore,
      auth,
      customers,
      activeCustomer,
      activePrices,
      loading,
      priceLoading,
      priceDialogOpen,
      formatMoney,
      productName,
      priceMatchesCustomer,
      refresh,
      openPriceDialog,
      closePriceDialog,
      openCreate,
      openCustomerOrders,
      noopTouchMove,
    };
  },
};
