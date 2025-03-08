import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";
interface Props {
    title: string;
    icon?: React.ReactNode;
    path?: string;
    className: string;
    img?: string;
    onClick?: React.MouseEventHandler;
}

const Button = ({ title, icon, path, className, img, onClick }: Props) => {
    const newClassName = twMerge(
        "flex whitespace-nowrap gap-1 text-sm font-bold lg:font-semibold items-center capitalize border-0 border rounded-lg py-1.5 px-3",
        className
    );

    return (
        <div>
            <Link to={path || ""} className={newClassName} onClick={onClick}>
                {img && <img src={img} className="w-[3.8%]" />}{title} {icon && icon}
            </Link>
        </div>
    );
};

export default Button;