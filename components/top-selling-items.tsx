// components/top-selling-items.tsx

'use client';

interface TopProduct {
    name: string;
    count: number;
}

interface TopSellingItemsProps {
    items: TopProduct[];
}

export const TopSellingItems: React.FC<TopSellingItemsProps> = ({ items }) => {
    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <div key={index} className="flex items-center">
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{item.name}</p>
                    </div>
                    <div className="ml-auto font-medium">+{item.count} sold</div>
                </div>
            ))}
        </div>
    )
}