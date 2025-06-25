interface PurchaseItemProps {
  id: string;
  name: string;
  retailer: string;
  purchaseDate: Date;
  returnByDate: Date;
  isApproachingDeadline: boolean;
}

export function PurchaseItem({
  name,
  retailer,
  purchaseDate,
  returnByDate,
  isApproachingDeadline,
}: PurchaseItemProps) {
  const daysLeft = Math.ceil(
    (returnByDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      className={`p-4 border rounded-lg mb-4 ${
        isApproachingDeadline
          ? 'border-yellow-400 bg-yellow-50'
          : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{name}</h3>
          <p className="text-sm text-gray-600">Purchased from {retailer}</p>
          <p className="text-sm text-gray-600">
            Purchased on: {purchaseDate.toLocaleDateString()}
          </p>
        </div>
        <div
          className={`text-right ${
            isApproachingDeadline ? 'text-yellow-700' : 'text-gray-700'
          }`}
        >
          <p className="font-medium">Return by:</p>
          <p className="text-sm">{returnByDate.toLocaleDateString()}</p>
          <p
            className={`text-sm font-medium ${
              daysLeft <= 3 ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {daysLeft} days left
          </p>
        </div>
      </div>
    </div>
  );
}
