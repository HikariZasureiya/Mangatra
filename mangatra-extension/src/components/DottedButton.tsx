import { FiRefreshCw } from "react-icons/fi";

const DottedButton = () => {
  return (
    <button
      className="
        group
        text-[4px]
        text-blue-700
        rounded-2xl
        border-2
        border-dashed
        border-blue-700
        bg-white
        px-5
        py-2.5
        font-semibold
        uppercase
        transition-all
        duration-300
        hover:-translate-x-1
        hover:-translate-y-1
        hover:rounded-md
        hover:shadow-[4px_4px_0px_blue]
        active:translate-x-0
        active:translate-y-0
        active:rounded-2xl
        active:shadow-none
        cursor-pointer
        flex
        items-center
        space-x-2
      "
    >
      <h1>Reload</h1>

      <FiRefreshCw
        size={16}
        className="
          text-blue-700
          transition-transform
          duration-500
          group-hover:animate-spin
        "
      />
    </button>
  );
};

export default DottedButton;
