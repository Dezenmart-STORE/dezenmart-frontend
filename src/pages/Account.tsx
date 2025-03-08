import { RiSettings3Fill, RiVerifiedBadgeFill } from 'react-icons/ri'
import { Avatar2, Product1 } from '.'
import Button from '../ui/Button'
import Container from '../ui/Container'
import { MdOutlineCheckCircleOutline } from 'react-icons/md'
import { LiaAngleDownSolid } from 'react-icons/lia'
import { useState } from 'react'


const Account = () => {
    const [tab, setTab]: any = useState("1");
    return (
        <div className='bg-Dark'>
            <Container className=''>
                <div className="flex items-center justify-between w-full mb-10">
                    <h1 className='text-white font-bold text-xl'>Profile</h1>
                    <span><RiSettings3Fill className="text-white text-2xl" /></span>
                </div>
                <div className="flex flex-col items-center justify-center mt-10">
                    <img src={Avatar2} className='w-[121px] mb-3' alt="" />
                    <h2 className='text-white text-2xl font-bold'>Albert Flores</h2>
                    <div className="flex items-center justify-center gap-1">
                        <h3 className='text-white text-xl my-2'>albertflores@mail.com</h3><MdOutlineCheckCircleOutline className='text-[#1FBE42] text-2xl' />
                    </div>
                    <Button title="Edit Profile" icon={<LiaAngleDownSolid />} path="" className="bg-white text-black text-lg font-bolder h-11 rounded-none flex justify-center w-[360px] md:w-[450px] lg:w-[650px] border-none outline-none text-center my-2" />
                </div>
                <div className="flex bg-[#292B30] items-center gap-8 mt-40 p-2 w-[38%]">
                    <button className={`${tab === "1" ? "bg-[#FF343F]" : ""} text-white rounded-lg px-4 py-2 font-bold`} onClick={() => setTab("1")}>Order History</button>
                    <button className={`${tab === "2" ? "bg-[#FF343F]" : ""} text-white rounded-lg px-4 py-2 font-bold`} onClick={() => setTab("2")}>Saved Items</button>
                    <button className={`${tab === "3" ? "bg-[#FF343F]" : ""} text-white rounded-lg px-4 py-2 font-bold`} onClick={() => setTab("3")}>Dispute Center</button>
                </div>

                {tab === "1" && (<div className="">
                    <div className="flex gap-5 items-center justify-between bg-[#292B30] p-8 mt-8">
                        <div className='flex items-center justify-center gap-8'>
                            <img src={Product1} alt="" className='w-[35%]' />
                            <div className='text-white'>
                                <h3 className='font-bold text-xl'>Vaseline Lotion</h3>
                                <span className='flex items-center gap-2 text-[12px] text-[#AEAEB2]'>By DanBike <RiVerifiedBadgeFill className='text-[#4FA3FF] text-xs' /></span>
                                <h6 className='text-[#AEAEB2] text-12px]'>300 items Bought @0.0002 ETH</h6>
                            </div>
                        </div>
                        <div className='flex flex-col text-white'>
                            <span className='text-[12px]'>Ordered: &nbsp; Jan 20, 2025</span>
                            <span className='text-[12px] my-2'>Status:&nbsp; <span className='p-1 rounded-md bg-[#62FF0033]'>In Escrow</span></span>
                        </div>
                        <Button title="View Details" className='bg-[#ff343f] border-0 rounded-none text-white px-14 py-2' path="" />
                    </div>
                    <div className="flex gap-5 items-center justify-between bg-[#292B30] p-8 mt-8">
                        <div className='flex items-center justify-center gap-8'>
                            <img src={Product1} alt="" className='w-[35%]' />
                            <div className='text-white'>
                                <h3 className='font-bold text-xl'>Vaseline Lotion</h3>
                                <span className='flex items-center gap-2 text-[12px] text-[#AEAEB2]'>By DanBike <RiVerifiedBadgeFill className='text-[#4FA3FF] text-xs' /></span>
                                <h6 className='text-[#AEAEB2] text-12px]'>300 items Bought @0.0002 ETH</h6>
                            </div>
                        </div>
                        <div className='flex flex-col text-white'>
                            <span className='text-[12px]'>Ordered: &nbsp; Jan 20, 2025</span>
                            <span className='text-[12px] my-2'>Status:&nbsp; <span className='p-1 rounded-md bg-[#543A2E]'>Shipped</span></span>
                        </div>
                        <Button title="View Details" className='bg-[#ff343f] border-0 rounded-none text-white px-14 py-2' path="" />

                    </div>
                </div>)}


                {/* dispute products  */}
                {tab === "2" && (
                    < div className='flex items-center gap-48 px-[20%] py-10 bg-[#292B30] mt-8'>
                        <img src={Product1} className='w-[40%] h-auto' alt="" />
                        <div className='flex flex-col'>
                            <h3 className='font-bold text-2xl text-white'>Vaseline Lotion</h3>
                            <span className='flex items-center gap-2 text-[12px] text-[#AEAEB2] mb-6'>By DanBike <RiVerifiedBadgeFill className='text-[#4FA3FF] text-xs' /></span>
                            <div className='flex justify-between mb-4'>
                                <h6 className="text-xs text-white">Dispute Raised:</h6>
                                <h6 className="text-xs text-white">Jan 15, 2025</h6>
                            </div>
                            <div className='flex items-center justify-between mb-4'>
                                <h6 className="text-xs text-white">Dispute Status:</h6>
                                <span className='text-xs text-white p-1 rounded-md bg-[#543A2E]'> Under Review</span>
                            </div>
                            <Button title="View Dispute" className='bg-[#ff343f] border-0 rounded-none text-white px-24 py-[8px] mt-4' path="" />
                        </div>
                    </div>)}



                {/* save products  */}
                {tab === "3" && (<div className='flex flex-col gap-24 items-center justify-center px-11 py-24 bg-[#292B30] mt-8'>
                    <h1 className='text-white text-2xl font-semibold'>Your wishlist is empty.</h1>
                    <Button title="Browse Products" className='bg-[#ff343f] border-0 rounded-none text-white px-14 py-2' path="" />
                </div>)}



            </Container >
        </div >
    )
}

export default Account