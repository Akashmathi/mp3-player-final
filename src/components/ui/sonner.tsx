import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  // We are setting the theme to "dark" to match your app's design
  return (
    <Sonner theme="dark" {...props} />
  )
};

export { Toaster };