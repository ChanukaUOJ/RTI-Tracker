
export default function getStatusColor(statusName: string): string {

    var statusColor = "bg-gray-50 text-gray-600"
    switch (statusName) {
        case "CREATED":
            statusColor = "border-blue-200 bg-blue-50 text-blue-600"
            break;
        case "APPROVAL":
            statusColor = "border-amber-200 bg-amber-50 text-amber-600"
            break;
        case "DELIVERY":
            statusColor = "border-indigo-200 bg-indigo-50 text-indigo-600"
            break;
        case "ACKNOWLEDGE":
            statusColor = "border-teal-200 bg-teal-50 text-teal-600"
            break;
        case "ACCEPTED":
            statusColor = "border-green-200 bg-green-50 text-green-600"
            break;
        case "REJECTED":
            statusColor = "border-red-200 bg-red-50 text-red-600"
            break;
        case "COMPLETED":
            statusColor = "border-emerald-200 bg-emerald-50 text-emerald-600"
            break;
        case "APPEAL":
            statusColor = "border-orange-200 bg-orange-50 text-orange-600"
            break;
    }

    return statusColor
}