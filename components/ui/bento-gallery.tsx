"use client"

import React, { useRef, useState, useEffect } from "react"
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "motion/react"
import { cn } from "@/lib/utils" // Assumes a 'lib/utils.ts' file for 'cn'
import { X } from "lucide-react"

// Defines the structure for each image item in the gallery
export type ImageItem = {
  id: number | string
  title: string
  desc: string
  url: string
  span: string // Tailwind CSS grid span classes (e.g., "md:col-span-2")
  prompt?: string
  model?: string
  aspectRatio?: string
  timestamp?: string
}

// Defines the props for the main gallery component
interface InteractiveImageBentoGalleryProps {
  imageItems: ImageItem[]
  title: string
  description: string
}

// Animation variants for the container to stagger children
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

// Animation variants for each gallery item
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
}

// Modal component for displaying the selected image
const ImageModal = ({
  item,
  onClose,
}: {
  item: ImageItem
  onClose: () => void
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-5xl rounded-2xl border border-emerald-950 bg-[#020503] p-6 shadow-2xl flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Image Container */}
        <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden min-h-[300px]">
          <img
            src={item.url}
            alt={item.title}
            className="h-auto max-h-[70vh] w-full object-contain"
          />
        </div>

        {/* Right: Metadata Details */}
        <div className="w-full md:w-80 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-mono font-bold text-emerald-500 uppercase tracking-widest block mb-1">GENERATED ASSET</span>
              <h3 className="text-xl font-bold text-white tracking-tight">{item.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
            </div>

            {item.prompt && (
              <div className="p-3 rounded-lg bg-black/60 border border-emerald-950 space-y-1">
                <span className="text-[8px] font-mono font-bold text-emerald-600 block uppercase tracking-wider">CREATIVE PROMPT</span>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  "{item.prompt}"
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              {item.model && (
                <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-950/40">
                  <span className="text-slate-500 block text-[8px] uppercase">SYNTH MODEL</span>
                  <span className="text-emerald-400 font-bold">{item.model}</span>
                </div>
              )}
              {item.aspectRatio && (
                <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-950/40">
                  <span className="text-slate-500 block text-[8px] uppercase">DIMENSION RATIO</span>
                  <span className="text-[#00ff66] font-bold">{item.aspectRatio}</span>
                </div>
              )}
              {item.timestamp && (
                <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-950/40 col-span-2">
                  <span className="text-slate-500 block text-[8px] uppercase">TIMESTAMP</span>
                  <span className="text-slate-300">{item.timestamp}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-emerald-950/50">
            <a
              href={item.url}
              download={`synthetic-${item.id}.jpg`}
              className="flex-1 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00ff66] border border-emerald-500/30 rounded-lg text-xs font-mono font-bold text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              DOWNLOAD IMAGE
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg text-xs font-mono font-bold transition-all"
            >
              CLOSE
            </button>
          </div>
        </div>
      </motion.div>
      <button
        onClick={onClose}
        className="absolute right-6 top-6 text-white/80 transition-colors hover:text-white p-2 bg-black/50 rounded-full hover:bg-slate-900/60"
        aria-label="Close image view"
      >
        <X size={24} />
      </button>
    </motion.div>
  )
}

// Main gallery component
const InteractiveImageBentoGallery: React.FC<
  InteractiveImageBentoGalleryProps
> = ({ imageItems, title, description }) => {
  const [selectedItem, setSelectedItem] = useState<ImageItem | null>(null)
  const [dragConstraint, setDragConstraint] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)

  // Calculate the draggable area constraint
  useEffect(() => {
    const calculateConstraints = () => {
      if (gridRef.current && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const gridWidth = gridRef.current.scrollWidth
        // The '- 32' provides some padding at the end
        const newConstraint = Math.min(0, containerWidth - gridWidth - 32)
        setDragConstraint(newConstraint)
      }
    }

    calculateConstraints()
    window.addEventListener("resize", calculateConstraints)
    return () => window.removeEventListener("resize", calculateConstraints)
  }, [imageItems])

  // Framer Motion scroll animations
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0, 0.2], [30, 0])

  return (
    <section
      ref={targetRef}
      className="relative w-full overflow-hidden bg-black/40 border border-emerald-950/40 rounded-2xl py-10 px-4 md:px-8 shadow-inner"
    >
      <motion.div
        style={{ opacity, y }}
        className="container mx-auto px-4 text-center max-w-xl"
      >
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-display uppercase tracking-wider">
          {title}
        </h2>
        <p className="mx-auto mt-2 text-xs text-emerald-500/60 font-mono uppercase">
          {description}
        </p>
      </motion.div>

      <div
        ref={containerRef}
        className="relative mt-8 w-full cursor-grab active:cursor-grabbing overflow-x-hidden"
      >
        <motion.div
          className="w-max"
          drag="x"
          dragConstraints={{ left: dragConstraint, right: 0 }}
          dragElastic={0.05}
        >
          <motion.div
            ref={gridRef}
            className="grid auto-cols-[minmax(14rem,14rem)] grid-flow-col gap-4 px-2"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {imageItems.map((item) => (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className={cn(
                  "group relative flex h-60 w-56 cursor-pointer items-end overflow-hidden rounded-xl border border-emerald-950 bg-[#020503] p-4 shadow-sm transition-shadow duration-300 ease-in-out hover:border-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  item.span,
                )}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
                onClick={() => setSelectedItem(item)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedItem(item)}
                tabIndex={0}
                aria-label={`View ${item.title}`}
              >
                <img
                  src={item.url}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 w-full transition-all duration-300">
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wide truncate">{item.title}</h3>
                  <p className="mt-0.5 text-[9px] text-[#00ff66] font-mono tracking-wider">{item.model}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <ImageModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>
    </section>
  )
}

export default InteractiveImageBentoGallery
