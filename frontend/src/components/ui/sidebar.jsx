import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, LayoutDashboard, User, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const SidebarContext = createContext(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}) => {
  const [openState, setOpenState] = useState(true);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate = true,
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        'h-full py-5 px-3.5 hidden md:flex md:flex-col bg-[#F6F7F9] flex-shrink-0 border-r border-black/[0.06] select-none',
        className
      )}
      animate={{
        width: animate ? (open ? '270px' : '82px') : '270px',
      }}
      transition={{
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}) => {
  const { open, setOpen } = useSidebar();
  return (
    <div
      className="h-14 px-4 py-3 flex flex-row md:hidden items-center justify-between bg-[#F6F7F9] border-b border-black/[0.06] w-full"
      {...props}
    >
      <div className="flex items-center space-x-2">
        <div className="h-6 w-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
          SX
        </div>
        <span className="text-xs font-bold text-neutral-900">SUBNEX</span>
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="text-neutral-800 p-2 rounded-full hover:bg-black/[0.05] transition-colors"
        aria-label="Toggle navigation"
      >
        <Menu className="w-5 h-5" strokeWidth={1.75} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={cn(
              'fixed inset-0 h-full w-full bg-[#F6F7F9] p-5 z-[100] flex flex-col justify-between overflow-y-auto',
              className
            )}
          >
            <div
              className="absolute right-5 top-5 z-50 text-neutral-800 cursor-pointer p-2 rounded-full hover:bg-black/[0.05] transition-colors"
              onClick={() => setOpen(false)}
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  active,
  onClick,
  ...props
}) => {
  const { open, animate } = useSidebar();
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center justify-between w-full rounded-[22px] transition-all duration-150 text-left',
        active
          ? 'bg-[#121316] text-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] px-3.5 py-3'
          : 'text-neutral-700 hover:text-neutral-950 hover:bg-black/[0.035] px-3.5 py-2.5',
        className
      )}
      {...props}
    >
      <div className="flex items-center space-x-3.5 min-w-0">
        <div className="flex-shrink-0">
          {link.icon}
        </div>
        <motion.span
          animate={{
            display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
            opacity: animate ? (open ? 1 : 0) : 1,
          }}
          transition={{ duration: 0.15 }}
          className={cn(
            'text-sm font-semibold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis',
            active ? 'text-white font-bold' : 'text-neutral-800'
          )}
        >
          {link.label}
        </motion.span>
      </div>

      {link.badge && open && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-2 flex-shrink-0',
            link.badgeColor || 'bg-rose-500 text-white'
          )}
        >
          {link.badge}
        </motion.span>
      )}
    </button>
  );
};

export function SidebarDemo() {
  const links = [
    {
      label: 'Dashboard',
      href: '#',
      icon: <LayoutDashboard className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
    {
      label: 'Profile',
      href: '#',
      icon: <User className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
    {
      label: 'Settings',
      href: '#',
      icon: <Settings className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
    {
      label: 'Logout',
      href: '#',
      icon: <LogOut className="h-5 w-5 shrink-0 text-neutral-700" />,
    },
  ];
  const [open, setOpen] = useState(false);
  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-[#F5F6F8] md:flex-row shadow-sm',
        'h-[60vh]'
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <div className="flex items-center space-x-2 py-1 text-sm font-normal text-black">
              <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black" />
              {open && <span className="font-bold text-black tracking-tight">SUBNEX</span>}
            </div>
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: 'Account',
                icon: (
                  <div className="h-7 w-7 shrink-0 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center">
                    SX
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-1 p-6 bg-white rounded-tl-2xl">
        <div className="h-full w-full rounded-xl bg-neutral-50 border border-neutral-200 p-6">
          <h2 className="font-bold text-lg text-neutral-900">Dashboard View</h2>
        </div>
      </div>
    </div>
  );
}
