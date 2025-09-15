interface StatusLabelProps {
  type: 'urgency' | 'lead_source' | 'status' | 'deal_type';
  value: string;
}

export const StatusLabel = ({ type, value }: StatusLabelProps) => {
  const getLabelStyles = (type: string, value: string) => {
    switch (type) {
      case 'urgency':
        switch (value.toLowerCase()) {
          case 'super urgent':
            return 'bg-red-800 text-white';
          case 'urgent':
            return 'bg-red-500 text-white';
          case 'mid priority':
            return 'bg-orange-500 text-white';
          case 'not priority':
            return 'bg-blue-500 text-white';
          default:
            return 'bg-gray-500 text-white';
        }
      case 'lead_source':
        switch (value.toLowerCase()) {
          case 'facebook':
            return 'bg-green-500 text-white';
          case 'google':
            return 'bg-blue-500 text-white';
          case 'referral':
            return 'bg-purple-500 text-white';
          default:
            return 'bg-gray-500 text-white';
        }
      case 'status':
        switch (value.toLowerCase()) {
          case 'new':
            return 'bg-orange-500 text-white';
          case 'waiting':
            return 'bg-yellow-500 text-black';
          case 'in progress':
            return 'bg-blue-500 text-white';
          case 'completed':
            return 'bg-green-500 text-white';
          default:
            return 'bg-gray-500 text-white';
        }
      case 'deal_type':
        switch (value.toLowerCase()) {
          case 'buyer lead':
            return 'bg-blue-100 text-blue-800';
          case 'rental':
            return 'bg-green-100 text-green-800';
          case 'seller lead':
            return 'bg-purple-100 text-purple-800';
          default:
            return 'bg-gray-100 text-gray-800';
        }
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getLabelStyles(type, value)}`}>
      {value}
    </span>
  );
};
