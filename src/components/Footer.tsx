import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  return (
    <footer className={cn(
      "w-full py-4 px-6 border-t border-border bg-background/95 backdrop-blur-sm",
      "text-center text-sm text-muted-foreground",
      className
    )}>
      <div className="flex flex-col items-center space-y-1">
        <p>by <span className="font-semibold text-primary">AOGTech.ph</span></p>
        <p className="text-xs opacity-75">© 2025 All rights reserved</p>
      </div>
    </footer>
  );
};

export default Footer;
