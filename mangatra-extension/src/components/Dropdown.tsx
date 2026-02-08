import { motion } from "framer-motion";
import { type Dispatch, type SetStateAction, useState } from "react";

const StaggeredDropDown = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex ml-7">
      <motion.div animate={open ? "open" : "closed"} className="relative">
        <button
          onClick={() => setOpen((pv) => !pv)}
          className="rounded-2xl border-2 border-dashed border-yellow-300 bg-white px-5 py-2.5 font-semibold text-yellow-300 transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:rounded-md hover:shadow-[4px_4px_0px_yellow] active:translate-x-0 active:translate-y-0 active:rounded-2xl active:shadow-none cursor-pointer"
        >
          <span className="font-medium text-sm">Translation Models</span>
        </button>

        <motion.ul
          initial={wrapperVariants.closed}
          variants={wrapperVariants}
          style={{ originY: "top", translateX: "-50%" }}
          className="z-95 flex flex-col gap-2 p-2 rounded-lg bg-white shadow-xl absolute top-[120%] left-[50%] w-48 overflow-hidden"
        >
          <Option setOpen={setOpen}  text="Gemini 2.5-Pro" />
          <Option setOpen={setOpen}  text="DeepL" />
          <Option setOpen={setOpen}  text="llama-3" />
          <Option setOpen={setOpen} text="Gemini 2.5-flash" />
        </motion.ul>
      </motion.div>
    </div>
  );
};

const Option = ({
  text,
  setOpen,
}: {
  text: string;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  return (
    <motion.li
      variants={itemVariants}
      onClick={() =>{ 
        setOpen(false);
      }}
      className="flex items-center gap-2 w-full p-2 text-xs font-medium whitespace-nowrap rounded-md hover:bg-yellow-700/10 text-slate-700 hover:text-yellow-300 transition-colors cursor-pointer"
    >
      <span>{text}</span>
    </motion.li>
  );
};

export default StaggeredDropDown;

const wrapperVariants = {
  open: {
    scaleY: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  closed: {
    scaleY: 0,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.1,
    },
  },
};


const itemVariants = {
  open: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
    },
  },
  closed: {
    opacity: 0,
    y: -15,
    transition: {
      when: "afterChildren",
    },
  },
};

// const actionIconVariants = {
//   open: { scale: 1, y: 0 },
//   closed: { scale: 0, y: -7 },
// };