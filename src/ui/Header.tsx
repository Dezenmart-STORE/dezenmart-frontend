import Container from './Container'
import { HiOutlineBell } from 'react-icons/hi'
import { Avatar, Mainlogo } from '../pages'
import { Link, NavLink, useLocation } from 'react-router-dom'

// const NavList: string[] = ["Home", "Product", "Trade", "Community", "Account"]
const NavList = [
    { title: "Home", path: "/" },
    { title: "Product", path: "/product" },
    { title: "Trade", path: "/trade" },
    { title: "Community", path: "/community" },
    { title: "Account", path: "/account" }
];

const Header = () => {

    const location = useLocation();
    return (
        <div className='w-full py-3 bg-[#212428] shadow-md'>
            <Container className='flex items-center justify-between py-0'>
                <Link to="/"> <img src={Mainlogo} className='w-[35px]' alt="" /></Link>
                <div className='flex items-center gap-10'>
                    {NavList.map(({ title, path }) => (
                        <NavLink to={path || ""} className={`font-semibold text-md ${location.pathname === path ? "text-[#545456]" : "text-Red"}`}>{title}</NavLink>
                    ))}
                </div>
                <div className="flex gap-3">
                    <HiOutlineBell className='text-xl text-white' />
                    <img src={Avatar} alt="" />
                </div>

            </Container>
        </div>
    )
}

export default Header