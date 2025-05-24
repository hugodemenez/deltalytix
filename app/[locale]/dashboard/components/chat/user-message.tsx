import { motion } from "motion/react";

export function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex w-full mb-3 justify-end"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="max-w-[80%] overflow-hidden">
        <div className="p-3 rounded-lg rounded-br-none break-words overflow-hidden bg-primary text-primary-foreground">
          <div className="text-pretty">{children}</div>
        </div>
      </div>
    </motion.div>
  )
}
