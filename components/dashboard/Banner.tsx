interface BannerProps {
  onClose: () => void;
}

export const Banner = ({ onClose }: BannerProps) => {
  return (
    <div className="flex items-center justify-between bg-green-50 px-4 py-3 text-sm text-gray-800">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">✓</span>
        <span>Welcome to the improved Home. Find, navigate to, and manage your apps more easily.</span>
      </div>
      <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
    </div>
  );
};
