import { Browseproduct, Mywallet, Pen, Pen2, Trackorder } from "."
import Container from "../ui/Container"
import ProductList from "../ui/ProductList"





const Home = () => {

    return (
        <div className='bg-Dark'>
            <Container className="">
                <h4 className="text-[20px] text-white mb-0">Welcome, Joe.</h4>
                <span className="text-[#C6C6C8] text-[13px]">What would you like to do today?</span>

                {/* div housing the thress circle box  */}
                <div className="flex mt-20 gap-10">
                    {/* /box section  */}
                    <div className="flex flex-col items-center justify-center gap-3">
                        <span className="bg-[#292B30] rounded-full p-8">
                            <img src={Browseproduct} alt="" className="w-[24px] h-[24px]" />
                        </span>
                        <h3 className="text-[#AEAEB2] text-lg">Browse Products</h3>
                    </div>

                    {/* /box section  */}
                    <div className="flex flex-col items-center justify-center gap-3">
                        <span className="bg-[#292B30] rounded-full p-8">
                            <img src={Trackorder} alt="" className="w-[24px] h-[24px]" />
                        </span>
                        <h3 className="text-[#AEAEB2] text-lg">Track Order</h3>
                    </div>

                    {/* /box section  */}
                    <div className="flex flex-col items-center justify-center gap-3">
                        <span className="bg-[#292B30] rounded-full p-8">
                            <img src={Mywallet} alt="" className="w-[24px] h-[24px]" />
                        </span>
                        <h3 className="text-[#AEAEB2] text-lg">My Wallet</h3>
                    </div>
                </div>

                <div className="flex justify-between items-center px-4 bg-Red rounded-lg mt-10 lg:mt-28">
                    <h5 className="text-white">Smart Ecommerce for <span className="uppercase font-bold">creators</span></h5>
                    <div className="flex items-center justify-center gap-2">
                        <img src={Pen} alt="" className="w-[90px] h-[90px]" />
                        <img src={Pen2} alt="" className="w-[69px] h-[67px]" />
                    </div>
                </div>

                <ProductList title="Featured Product" path="/featured" className="mt-10" />
            </Container>
        </div>
    )
}

export default Home