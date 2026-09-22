import {
  useEffect,
  useMemo,
  useState,
} from "react";

import axiosInstance from "../../lib/axiosinstance";

type BillingCycle =
  | "monthly"
  | "quarterly"
  | "yearly";

type PlanId =
  | "free"
  | "bronze"
  | "silver"
  | "gold";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;

  prefill?: {
    name?: string;
    email?: string;
  };

  theme?: {
    color?: string;
  };

  handler: (
    response: RazorpayResponse
  ) => void;

  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay: new (
      options: RazorpayOptions
    ) => RazorpayInstance;
  }
}

interface Plan {
  name: string;

  price: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };

  validity: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };

  dailyDownloadLimit: number;
  monthlyDownloadLimit: number;

  maxStreamingQuality: string;
  maxWatchMinutesPerDay: number;

  unlimitedVideoAccess: boolean;
  offlineDownloads: boolean;
  priorityContent: boolean;
  fasterStreaming: boolean;
  exclusiveCourses: boolean;
  adFree: boolean;
  premiumVideoAccess: boolean;

  features: string[];
}

interface Subscription {
  plan: PlanId;
  planName: string;
  status: string;
  billingCycle: BillingCycle;

  amount: number;
  currency: string;

  startDate: string | null;
  expiryDate: string | null;
  nextRenewalDate: string | null;

  remainingDays: number;

  autoRenew: boolean;
  cancelledAt: string | null;

  dailyDownloadLimit: number;
  monthlyDownloadLimit: number;

  maxStreamingQuality: string;
  maxWatchMinutesPerDay: number;

  unlimitedVideoAccess: boolean;
  offlineDownloads: boolean;
  priorityContent: boolean;
  fasterStreaming: boolean;
  exclusiveCourses: boolean;
  adFree: boolean;
  premiumVideoAccess: boolean;

  features: string[];
}

interface SubscriptionHistoryItem {
  _id: string;
  plan: PlanId;
  planName: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  status: string;
  startDate: string | null;
  expiryDate: string | null;
  nextRenewalDate: string | null;
  autoRenew: boolean;
  paymentId: string;
  orderId: string;
  invoiceNumber: string;
  createdAt: string;
}

const planOrder: PlanId[] = [
  "free",
  "bronze",
  "silver",
  "gold",
];

const formatDate = (
  date: string | null
) => {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const formatAmount = (
  amount: number
) => {
  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
};

const getUserId = () => {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const possibleKeys = [
    "userid",
    "userId",
    "userID",
  ];

  for (const key of possibleKeys) {
    const value =
      localStorage.getItem(key);

    if (value) {
      return value;
    }
  }

  const storedUser =
    localStorage.getItem("user");

  if (storedUser) {
    try {
      const parsed =
        JSON.parse(storedUser);

      return (
        parsed?._id ||
        parsed?.id ||
        parsed?.userid ||
        null
      );
    } catch {
      return null;
    }
  }

  return null;
};

const loadRazorpayScript =
  () => {
    return new Promise<boolean>(
      (resolve) => {
        if (
          typeof window !==
          "undefined" &&
          window.Razorpay
        ) {
          resolve(true);
          return;
        }

        const existingScript =
          document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
          );

        if (existingScript) {
          existingScript.addEventListener(
            "load",
            () => resolve(true)
          );

          existingScript.addEventListener(
            "error",
            () => resolve(false)
          );

          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.async = true;

        script.onload = () =>
          resolve(true);

        script.onerror = () =>
          resolve(false);

        document.body.appendChild(
          script
        );
      }
    );
  };

const SubscriptionPage =
  () => {
    const [plans, setPlans] =
      useState<Record<
        PlanId,
        Plan
      > | null>(null);

    const [
      subscription,
      setSubscription,
    ] = useState<Subscription | null>(
      null
    );

    const [
      history,
      setHistory,
    ] = useState<
      SubscriptionHistoryItem[]
    >([]);

    const [
      billingCycle,
      setBillingCycle,
    ] = useState<BillingCycle>(
      "monthly"
    );

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      paymentLoading,
      setPaymentLoading,
    ] = useState(false);

    const [
      actionLoading,
      setActionLoading,
    ] = useState(false);

    const [
      error,
      setError,
    ] = useState("");

    const [
      success,
      setSuccess,
    ] = useState("");

    const loadDashboard =
      async () => {
        try {
          setLoading(true);
          setError("");

          const userid =
            getUserId();

          if (!userid) {
            setError(
              "User information could not be found. Please login again."
            );

            return;
          }

          const [
            plansResponse,
            subscriptionResponse,
            historyResponse,
          ] =
            await Promise.all([
              axiosInstance.get(
                "/subscription/plans"
              ),

              axiosInstance.get(
                `/subscription/my/${userid}`
              ),

              axiosInstance.get(
                `/subscription/history/${userid}`
              ),
            ]);

          setPlans(
            plansResponse.data.plans
          );

          setSubscription(
            subscriptionResponse.data
              .subscription
          );

          setHistory(
            historyResponse.data
              .subscriptions ||
              []
          );

          if (
            subscriptionResponse
              .data
              .subscription
              ?.billingCycle
          ) {
            setBillingCycle(
              subscriptionResponse
                .data
                .subscription
                .billingCycle
            );
          }
        } catch (err) {
          console.error(
            "SUBSCRIPTION DASHBOARD ERROR:",
            err
          );

          setError(
            "Unable to load subscription dashboard."
          );
        } finally {
          setLoading(false);
        }
      };

    useEffect(() => {
      loadDashboard();
    }, []);

    /*
      ACTUAL RAZORPAY PAYMENT
    */

    const startPayment =
      async (
        plan: PlanId,
        cycle: BillingCycle
      ) => {
        if (plan === "free") {
          setError(
            "Free plan does not require Razorpay payment."
          );

          return;
        }

        try {
          setPaymentLoading(
            true
          );

          setError("");
          setSuccess("");

          const userid =
            getUserId();

          if (!userid) {
            setError(
              "Please login again."
            );

            return;
          }

          /*
            Load Razorpay Checkout.
          */

          const scriptLoaded =
            await loadRazorpayScript();

          if (!scriptLoaded) {
            setError(
              "Razorpay Checkout could not be loaded. Please check your internet connection."
            );

            return;
          }

          /*
            Ask our backend to create
            the Razorpay order.

            Amount is decided by the
            backend, NOT by frontend.
          */

          const orderResponse =
            await axiosInstance.post(
              "/payment/create-order",
              {
                userid,
                plan,
                billingCycle: cycle,
              }
            );

          const order =
            orderResponse.data.order;

          const keyId =
            orderResponse.data.keyId;

          if (
            !order ||
            !order.id ||
            !keyId
          ) {
            setError(
              "Invalid payment order received from server."
            );

            return;
          }

          /*
            Open Razorpay Checkout.
          */

          const options:
            RazorpayOptions = {
            key: keyId,

            amount:
              order.amount,

            currency:
              order.currency,

            name:
              "YouTube 2.0",

            description:
              `${plan.toUpperCase()} ${cycle} Subscription`,

            order_id:
              order.id,

            prefill: {},

            theme: {
              color: "#ffffff",
            },

            handler:
              async (
                response
              ) => {
                try {
                  setPaymentLoading(
                    true
                  );

                  setError("");
                  setSuccess("");

                  /*
                    Send the Razorpay
                    response to backend.

                    Backend performs the
                    signature verification.
                  */

                  const verifyResponse =
                    await axiosInstance.post(
                      "/payment/verify",
                      {
                        userid,

                        razorpay_order_id:
                          response.razorpay_order_id,

                        razorpay_payment_id:
                          response.razorpay_payment_id,

                        razorpay_signature:
                          response.razorpay_signature,
                      }
                    );

                  if (
                    verifyResponse
                      .data
                      .success
                  ) {
                    setSuccess(
                      verifyResponse
                        .data
                        .message ||
                        "Payment successful! Your subscription is now active."
                    );

                    await loadDashboard();
                  } else {
                    setError(
                      "Payment verification was not successful."
                    );
                  }
                } catch (verifyError: any) {
                  console.error(
                    "PAYMENT VERIFICATION ERROR:",
                    verifyError
                  );

                  setError(
                    verifyError
                      ?.response
                      ?.data
                      ?.message ||
                      "Payment was received but verification failed. Please contact support if money was deducted."
                  );
                } finally {
                  setPaymentLoading(
                    false
                  );
                }
              },

            modal: {
              ondismiss:
                async () => {
                  try {
                    await axiosInstance.post(
                      "/payment/failed",
                      {
                        userid,

                        razorpay_order_id:
                          order.id,

                        reason:
                          "Razorpay checkout was closed or cancelled by the user.",
                      }
                    );
                  } catch (error) {
                    console.error(
                      "PAYMENT CANCEL RECORD ERROR:",
                      error
                    );
                  }

                  setPaymentLoading(
                    false
                  );

                  setError(
                    "Payment was cancelled. Your subscription was not changed."
                  );
                },
            },
          };

          const razorpay =
            new window.Razorpay(
              options
            );

          razorpay.open();
        } catch (err: any) {
          console.error(
            "START PAYMENT ERROR:",
            err
          );

          setError(
            err?.response?.data
              ?.message ||
              "Unable to start Razorpay payment."
          );
        } finally {
          setPaymentLoading(
            false
          );
        }
      };

    /*
      CANCEL AUTO RENEWAL
    */

    const handleCancel =
      async () => {
        const confirmed =
          window.confirm(
            "Cancel auto-renewal for your current subscription?"
          );

        if (!confirmed) {
          return;
        }

        try {
          setActionLoading(
            true
          );

          setError("");
          setSuccess("");

          const userid =
            getUserId();

          if (!userid) {
            setError(
              "Please login again."
            );

            return;
          }

          const response =
            await axiosInstance.post(
              "/subscription/cancel",
              {
                userid,
              }
            );

          setSuccess(
            response.data.message
          );

          await loadDashboard();
        } catch (err: any) {
          console.error(err);

          setError(
            err?.response?.data
              ?.message ||
              "Unable to cancel subscription."
          );
        } finally {
          setActionLoading(
            false
          );
        }
      };

    /*
      RENEW CURRENT PLAN

      Renewal now starts Razorpay
      payment instead of merely
      changing autoRenew.
    */

    const handleRenew =
      async () => {
        if (!subscription) {
          return;
        }

        await startPayment(
          subscription.plan,
          subscription.billingCycle
        );
      };

    const currentPlanIndex =
      useMemo(() => {
        return subscription
          ? planOrder.indexOf(
              subscription.plan
            )
          : 0;
      }, [subscription]);

    if (loading) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-semibold">
              Loading subscription dashboard...
            </div>

            <div className="text-gray-400 mt-2">
              Please wait.
            </div>
          </div>
        </div>
      );
    }

    if (!plans) {
      return (
        <div className="min-h-screen bg-black text-white p-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold">
              Subscription
            </h1>

            <p className="text-red-400 mt-4">
              {error ||
                "Subscription plans could not be loaded."}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-white px-4 py-8 md:px-8">
        <div className="max-w-7xl mx-auto">

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold">
              Subscription
            </h1>

            <p className="text-gray-400 mt-2">
              Manage your membership,
              compare plans and make
              secure Test payments with
              Razorpay.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-300">
              {success}
            </div>
          )}

          {paymentLoading && (
            <div className="mb-5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-blue-300">
              Processing payment...
            </div>
          )}

          {subscription && (
            <div className="rounded-2xl border border-gray-800 bg-[#111] p-6 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

                <div>
                  <p className="text-gray-400 text-sm">
                    Current Plan
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <h2 className="text-3xl font-bold">
                      {
                        subscription.planName
                      }
                    </h2>

                    <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm text-green-400">
                      {
                        subscription.status
                      }
                    </span>
                  </div>

                  <p className="text-gray-400 mt-2">
                    Billing:{" "}
                    <span className="text-white capitalize">
                      {
                        subscription.billingCycle
                      }
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                  <div className="rounded-xl bg-[#181818] p-4">
                    <p className="text-gray-500 text-xs">
                      Remaining
                    </p>

                    <p className="text-xl font-semibold mt-1">
                      {
                        subscription.remainingDays
                      }{" "}
                      days
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#181818] p-4">
                    <p className="text-gray-500 text-xs">
                      Expires
                    </p>

                    <p className="text-sm font-semibold mt-1">
                      {formatDate(
                        subscription.expiryDate
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#181818] p-4">
                    <p className="text-gray-500 text-xs">
                      Next Renewal
                    </p>

                    <p className="text-sm font-semibold mt-1">
                      {formatDate(
                        subscription.nextRenewalDate
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#181818] p-4">
                    <p className="text-gray-500 text-xs">
                      Auto Renew
                    </p>

                    <p className="text-sm font-semibold mt-1">
                      {subscription.autoRenew
                        ? "Enabled"
                        : "Disabled"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">

                <h3 className="font-semibold text-lg">
                  Included Features
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {subscription.features.map(
                    (
                      feature,
                      index
                    ) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm text-gray-300"
                      >
                        <span className="text-green-400">
                          ✓
                        </span>

                        <span>
                          {
                            feature
                          }
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">

                {subscription.plan !==
                  "free" &&
                  subscription.autoRenew && (
                    <button
                      onClick={
                        handleCancel
                      }
                      disabled={
                        actionLoading ||
                        paymentLoading
                      }
                      className="rounded-lg border border-red-500/40 px-5 py-2.5 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Cancel Auto-Renew
                    </button>
                  )}

                {subscription.plan !==
                  "free" &&
                  !subscription.autoRenew && (
                    <button
                      onClick={
                        handleRenew
                      }
                      disabled={
                        actionLoading ||
                        paymentLoading
                      }
                      className="rounded-lg bg-white px-5 py-2.5 text-black font-medium hover:bg-gray-200 disabled:opacity-50"
                    >
                      Renew with Razorpay
                    </button>
                  )}
              </div>
            </div>
          )}

          <div className="mb-6">

            <h2 className="text-2xl font-bold">
              Choose Billing Cycle
            </h2>

            <div className="flex flex-wrap gap-3 mt-4">
              {(
                [
                  "monthly",
                  "quarterly",
                  "yearly",
                ] as BillingCycle[]
              ).map(
                (cycle) => (
                  <button
                    key={cycle}
                    onClick={() =>
                      setBillingCycle(
                        cycle
                      )
                    }
                    className={`rounded-lg px-6 py-3 border capitalize transition ${
                      billingCycle ===
                      cycle
                        ? "bg-white text-black border-white"
                        : "bg-[#111] text-gray-300 border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    {cycle}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="mb-10">

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">

              <div>
                <h2 className="text-2xl font-bold">
                  Compare Plans
                </h2>

                <p className="text-gray-400 mt-1">
                  Choose a plan and
                  complete payment through
                  Razorpay Test Checkout.
                </p>
              </div>

              <div className="text-gray-400 text-sm capitalize">
                Showing{" "}
                {billingCycle} pricing
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

              {planOrder.map(
                (planId) => {
                  const plan =
                    plans[planId];

                  const planIndex =
                    planOrder.indexOf(
                      planId
                    );

                  const isCurrent =
                    subscription?.plan ===
                    planId;

                  const isUpgrade =
                    planIndex >
                    currentPlanIndex;

                  const isDowngrade =
                    planIndex <
                    currentPlanIndex;

                  return (
                    <div
                      key={planId}
                      className={`rounded-2xl border p-6 bg-[#111] ${
                        isCurrent
                          ? "border-white"
                          : "border-gray-800"
                      }`}
                    >

                      <div className="flex items-center justify-between gap-2">

                        <h3 className="text-2xl font-bold">
                          {
                            plan.name
                          }
                        </h3>

                        {isCurrent && (
                          <span className="text-xs rounded-full bg-white text-black px-2.5 py-1">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="mt-5">

                        <span className="text-3xl font-bold">
                          {formatAmount(
                            plan.price[
                              billingCycle
                            ]
                          )}
                        </span>

                        <span className="text-gray-500 ml-1">
                          /{" "}
                          {
                            billingCycle
                          }
                        </span>
                      </div>

                      <p className="text-gray-400 text-sm mt-2">
                        Valid for{" "}
                        {
                          plan.validity[
                            billingCycle
                          ]
                        }{" "}
                        days
                      </p>

                      <div className="mt-6 space-y-3">

                        <div className="text-sm">
                          <span className="text-gray-500">
                            Streaming:
                          </span>{" "}
                          {
                            plan.maxStreamingQuality
                          }
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500">
                            Watch time:
                          </span>{" "}
                          {
                            plan.maxWatchMinutesPerDay
                          }{" "}
                          min/day
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500">
                            Downloads:
                          </span>{" "}
                          {
                            plan.dailyDownloadLimit
                          }{" "}
                          /day
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500">
                            Premium videos:
                          </span>{" "}
                          {plan.premiumVideoAccess
                            ? "Included"
                            : "Limited"}
                        </div>
                      </div>

                      <div className="border-t border-gray-800 mt-6 pt-5">

                        <p className="text-sm font-semibold mb-3">
                          Features
                        </p>

                        <div className="space-y-2">

                          {plan.features
                            .slice(
                              0,
                              6
                            )
                            .map(
                              (
                                feature,
                                index
                              ) => (
                                <div
                                  key={
                                    index
                                  }
                                  className="text-sm text-gray-400 flex gap-2"
                                >
                                  <span className="text-green-400">
                                    ✓
                                  </span>

                                  <span>
                                    {
                                      feature
                                    }
                                  </span>
                                </div>
                              )
                            )}
                        </div>
                      </div>

                      <div className="mt-6">

                        {isCurrent ? (
                          <button
                            disabled
                            className="w-full rounded-lg bg-gray-800 text-gray-500 px-4 py-3 cursor-not-allowed"
                          >
                            Current Plan
                          </button>
                        ) : planId ===
                          "free" ? (
                          <button
                            disabled
                            className="w-full rounded-lg bg-gray-800 text-gray-500 px-4 py-3 cursor-not-allowed"
                          >
                            Free Plan
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              startPayment(
                                planId,
                                billingCycle
                              )
                            }
                            disabled={
                              paymentLoading ||
                              actionLoading
                            }
                            className="w-full rounded-lg bg-white text-black font-semibold px-4 py-3 hover:bg-gray-200 disabled:opacity-50"
                          >
                            {isUpgrade
                              ? "Upgrade with Razorpay"
                              : isDowngrade
                              ? "Downgrade with Razorpay"
                              : "Pay with Razorpay"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#111] overflow-hidden mb-10">

            <div className="p-6 border-b border-gray-800">

              <h2 className="text-2xl font-bold">
                Feature Comparison
              </h2>
            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[800px] text-sm">

                <thead>
                  <tr className="border-b border-gray-800">

                    <th className="text-left p-4 text-gray-400">
                      Feature
                    </th>

                    {planOrder.map(
                      (planId) => (
                        <th
                          key={
                            planId
                          }
                          className="p-4 text-center"
                        >
                          {
                            plans[
                              planId
                            ].name
                          }
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>

                  {[
                    {
                      name: "Streaming Quality",
                      value: (
                        plan: Plan
                      ) =>
                        plan.maxStreamingQuality,
                    },

                    {
                      name: "Daily Watch Time",
                      value: (
                        plan: Plan
                      ) =>
                        `${plan.maxWatchMinutesPerDay} min`,
                    },

                    {
                      name: "Daily Downloads",
                      value: (
                        plan: Plan
                      ) =>
                        `${plan.dailyDownloadLimit}`,
                    },

                    {
                      name: "Premium Videos",
                      value: (
                        plan: Plan
                      ) =>
                        plan.premiumVideoAccess
                          ? "✓"
                          : "Limited",
                    },

                    {
                      name: "Offline Downloads",
                      value: (
                        plan: Plan
                      ) =>
                        plan.offlineDownloads
                          ? "✓"
                          : "—",
                    },

                    {
                      name: "Priority Content",
                      value: (
                        plan: Plan
                      ) =>
                        plan.priorityContent
                          ? "✓"
                          : "—",
                    },

                    {
                      name: "Faster Streaming",
                      value: (
                        plan: Plan
                      ) =>
                        plan.fasterStreaming
                          ? "✓"
                          : "—",
                    },

                    {
                      name: "Exclusive Courses",
                      value: (
                        plan: Plan
                      ) =>
                        plan.exclusiveCourses
                          ? "✓"
                          : "—",
                    },

                    {
                      name: "Ad-Free Viewing",
                      value: (
                        plan: Plan
                      ) =>
                        plan.adFree
                          ? "✓"
                          : "—",
                    },
                  ].map(
                    (
                      feature,
                      index
                    ) => (
                      <tr
                        key={index}
                        className="border-b border-gray-800 last:border-0"
                      >

                        <td className="p-4 text-gray-300">
                          {
                            feature.name
                          }
                        </td>

                        {planOrder.map(
                          (planId) => (
                            <td
                              key={
                                planId
                              }
                              className="p-4 text-center text-gray-400"
                            >
                              {
                                feature.value(
                                  plans[
                                    planId
                                  ]
                                )
                              }
                            </td>
                          )
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#111] overflow-hidden">

            <div className="p-6 border-b border-gray-800">

              <h2 className="text-2xl font-bold">
                Subscription History
              </h2>

              <p className="text-gray-400 text-sm mt-1">
                Your previous subscription
                and payment records.
              </p>
            </div>

            {history.length ===
            0 ? (
              <div className="p-8 text-center text-gray-500">
                No subscription history
                available yet.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-sm">

                  <thead>
                    <tr className="border-b border-gray-800">

                      <th className="text-left p-4">
                        Plan
                      </th>

                      <th className="text-left p-4">
                        Billing
                      </th>

                      <th className="text-left p-4">
                        Amount
                      </th>

                      <th className="text-left p-4">
                        Status
                      </th>

                      <th className="text-left p-4">
                        Start
                      </th>

                      <th className="text-left p-4">
                        Expiry
                      </th>

                      <th className="text-left p-4">
                        Invoice
                      </th>

                      <th className="text-left p-4">
                        Payment
                      </th>
                    </tr>
                  </thead>

                  <tbody>

                    {history.map(
                      (item) => (
                        <tr
                          key={
                            item._id
                          }
                          className="border-b border-gray-800 last:border-0"
                        >

                          <td className="p-4 font-medium">
                            {
                              item.planName
                            }
                          </td>

                          <td className="p-4 capitalize text-gray-400">
                            {
                              item.billingCycle
                            }
                          </td>

                          <td className="p-4">
                            {formatAmount(
                              item.amount
                            )}
                          </td>

                          <td className="p-4">
                            <span className="capitalize">
                              {
                                item.status
                              }
                            </span>
                          </td>

                          <td className="p-4 text-gray-400">
                            {formatDate(
                              item.startDate
                            )}
                          </td>

                          <td className="p-4 text-gray-400">
                            {formatDate(
                              item.expiryDate
                            )}
                          </td>

                          <td className="p-4 text-gray-400">
                            {
                              item.invoiceNumber ||
                              "—"
                            }
                          </td>

                          <td className="p-4 text-gray-400">
                            {item.paymentId
                              ? `${item.paymentId.slice(
                                  0,
                                  12
                                )}...`
                              : "—"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

export default SubscriptionPage;