import { useMemo, useState } from 'react';
import { DataSource } from '../components/DataSource';
import amazon from '../config/amazon.json';
import wayfair from './../config/wayfair.json';
import officedepot from '../config/officedepot.json';
// import nordstrom from '../config/nordstrom.json';
import type { BrandConfig } from '../modules/Config';
import calendarIcon from '../assets/calendar.svg';
import { AddToCalendar } from '../components/AddToCalendar';
import type { PurchaseHistory } from '../modules/DataTransformSchema';
import {
  downloadReturnRemindersCalendar,
  filterUniqueOrders,
  getDaysLeft,
  getEarliestReturnDate,
} from '../utils';

const amazonConfig = amazon as BrandConfig;
const wayfairConfig = wayfair as BrandConfig;
const officedepotConfig = officedepot as BrandConfig;
// const nordstromConfig = nordstrom as BrandConfig;

const BRANDS: Array<BrandConfig> = [
  amazonConfig,
  officedepotConfig,
  // nordstromConfig,
  wayfairConfig,
];

export function ReturnReminder() {
  const [orders, setOrders] = useState<PurchaseHistory[]>([]);
  const [connectedBrands, setConnectedBrands] = useState<string[]>([]);

  const sortedOrders = useMemo(() => {
    return orders.sort((a, b) => {
      return (
        new Date(b.order_date ?? new Date()).getTime() -
        new Date(a.order_date ?? new Date()).getTime()
      );
    });
  }, [orders]);

  const handleSuccessConnect = (brandName: string, data: PurchaseHistory[]) => {
    console.log('Received orders from', brandName, data);

    try {
      fetch('/log-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand: brandName, orders: data }),
      }).catch((err) => console.error('Failed to log orders on server:', err));
    } catch (err) {
      console.error('Failed to initiate server logging:', err);
    }
    setConnectedBrands((prev) => [...prev, brandName]);
    setOrders((prev) => {
      const combined = [
        ...prev,
        ...data.map((order) => {
          const maxReturnDates: Date[] = [];

          order.product_names.forEach((_, index) => {
            if (!order.max_return_dates?.[index] && order.order_date) {
              maxReturnDates.push(
                new Date(
                  new Date(order.order_date).setDate(
                    new Date(order.order_date).getDate() + 30
                  )
                )
              );
            }
          });

          if (Array.isArray(maxReturnDates) && maxReturnDates.length > 0) {
            return {
              ...order,
              max_return_dates: maxReturnDates,
            };
          }

          return order;
        }),
      ];
      return filterUniqueOrders(combined);
    });
  };

  const handleDownloadCalendar = () => {
    const productNotReachedReturnWindow: {
      brand: string;
      name: string;
      date: Date;
    }[] = [];

    orders.forEach((order) => {
      order.product_names.forEach((productName, index) => {
        const maxReturnDate = order.max_return_dates?.[index];
        if (!maxReturnDate) return;
        const productDaysLeft = maxReturnDate ? getDaysLeft(maxReturnDate) : 0;
        if (productDaysLeft > 0) {
          productNotReachedReturnWindow.push({
            brand: order.brand,
            name: productName,
            date: maxReturnDate,
          });
        }
      });
    });

    downloadReturnRemindersCalendar(productNotReachedReturnWindow);
  };

  const urgentOrders = useMemo(() => {
    return orders.filter((order) => {
      const earliestReturnDate = getEarliestReturnDate(order.max_return_dates);
      if (!earliestReturnDate) return false;
      const daysLeft = getDaysLeft(earliestReturnDate);
      return daysLeft <= 3 && daysLeft > 0;
    });
  }, [orders]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="text-center space-y-4 mb-8 mt-4">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-4xl font-bold text-gray-900">Return Reminder</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Never miss a return deadline again. Connect your shopping accounts and
          get notified when items are approaching their return expiration date.
        </p>
      </div>

      {urgentOrders.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <span className="font-bold">Urgent:</span> You have{' '}
                {urgentOrders.length}{' '}
                {urgentOrders.length === 1 ? 'order' : 'orders'} with return
                deadlines in the next 3 days. Make decision now!
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-6 h-6">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-full h-full"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Connect Your Shopping Accounts</h1>
        </div>
        <p className="text-gray-600 mb-8">
          Connect to your favorite retailers to track purchases and return
          deadlines. Amazon connection is required.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BRANDS.map((brandConfig) => (
            <DataSource
              key={brandConfig.brand_id}
              brandConfig={brandConfig}
              onSuccessConnect={(data) =>
                handleSuccessConnect(brandConfig.brand_name, data)
              }
              // disabled={
              //   !brandConfig.is_mandatory && !connectedBrands.includes('Amazon')
              // }
              isConnected={connectedBrands.includes(brandConfig.brand_name)}
            />
          ))}
        </div>
      </div>

      {orders.length > 0 && (
        <section className="mt-8 bg-white rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg
                  className="w-5 h-5 text-gray-700"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <h2 className="text-xl font-bold">
                  Recent Purchases & Return Deadlines
                </h2>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Items approaching their return expiration date
              </p>
            </div>
            <div>
              <button
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                onClick={handleDownloadCalendar}
              >
                <img src={calendarIcon} className="w-4 h-4" />
                Download Return Reminders
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {sortedOrders.map((order) => (
              <div
                key={order.order_id}
                className="border border-gray-300 rounded-lg hover:border-gray-400 transition-colors overflow-hidden"
              >
                {/* Order Header */}
                <div className="bg-gray-100 p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold px-2 py-0.5 bg-gray-200 rounded-full text-gray-700">
                          {order.brand}
                        </span>
                        <p className="text-sm font-medium text-gray-900">
                          Order #{order.order_id}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        Ordered: {order.order_date?.toLocaleDateString() ?? ''}
                        <span className="mx-2">•</span>
                        Total: {order.order_total}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Products */}
                <div className="divide-y divide-gray-100">
                  {order.product_names.map((productName, index) => {
                    const maxReturnDate = order.max_return_dates?.[index];
                    const productDaysLeft = maxReturnDate
                      ? getDaysLeft(maxReturnDate)
                      : 0;
                    const maxReturnDateStr = maxReturnDate
                      ? maxReturnDate.toISOString().slice(0, 10)
                      : '';

                    return (
                      <div
                        key={`${productName}_${index}`}
                        className="p-4 flex items-start gap-4"
                      >
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-50 rounded-md overflow-hidden">
                          <img
                            src={order.image_urls[index]}
                            alt={productName}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-gray-900 line-clamp-2">
                            {productName}
                          </h3>
                        </div>

                        <div className="flex-shrink-0">
                          {maxReturnDate && productDaysLeft > 0 ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  justifyContent: 'end',
                                }}
                              >
                                <div
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    productDaysLeft <= 1
                                      ? 'bg-red-100 text-red-800'
                                      : productDaysLeft <= 3
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-green-100 text-green-800'
                                  }`}
                                >
                                  {productDaysLeft === 1
                                    ? '1 day left'
                                    : `${productDaysLeft} days left`}
                                </div>
                              </div>
                              <AddToCalendar
                                name={`Return window for ${productName}`}
                                description={`Last day to return: ${maxReturnDateStr}`}
                                startDate={maxReturnDateStr}
                                endDate={maxReturnDateStr}
                                timeZone={
                                  Intl.DateTimeFormat().resolvedOptions()
                                    .timeZone
                                }
                              />
                            </div>
                          ) : (
                            <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                              Return window closed
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
