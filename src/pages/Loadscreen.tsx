import { Logo } from '.'

const Loadscreen = () => {
    return (
        <div className='w-full h-[100vh] bg-Dark flex items-center justify-center'>
            <img src={Logo} alt="" />
        </div>
    )
}

export default Loadscreen