import { LiaAngleLeftSolid } from 'react-icons/lia'
import Container from '../ui/Container'
import { FaRegCommentDots, FaRegHeart } from 'react-icons/fa'
import { Comment, Detail, Product1 } from '.'
import { useState } from 'react'
import { HiMenuAlt2 } from 'react-icons/hi'
import { IoIosArrowDown, IoIosArrowUp } from 'react-icons/io'
import { MdOutlineStar } from 'react-icons/md'
import { BiSolidQuoteRight } from 'react-icons/bi'



// const tabs = ["Tab 1", "Tab 2"] as const;

const SingleProduct = () => {

    const [activeTab, setActiveTab] = useState("details");
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (section: any) => {
        setOpenSection(openSection === section ? null : section);
    };


    return (
        <div className='bg-Dark'>
            <div className='bg-gradient-to-b from-[#855d43] via-[#352f2d]/4 to-[#352f2d]/2'>
                <Container className='relative flex flex-col items-center'>

                    <div className="flex items-center justify-between w-full absolute top-4">
                        <LiaAngleLeftSolid className="text-2xl text-white" />
                        <FaRegHeart className='text-2xl text-white' />
                    </div>
                    <img src={Product1} className='w-[25%]' alt="" />
                </Container>
            </div>
            <div>
                <Container className=''>
                    <div className="bg-[#292B30] shadow-xl text-white w-full max-w-4xl mx-auto">
                        {/* Tabs */}
                        <div className="flex  items-center justify-between border-b border-gray-700 px-20 pt-4">
                            <button
                                className={` flex items-center justify-center gap-2 text-xl font-bold ${activeTab === "details" ? "text-Red" : "text-gray-400"
                                    }`}
                                onClick={() => setActiveTab("details")}
                            >
                                <span>
                                    <span className='flex mb-4'>
                                        {/* <HiMenuAlt2 className='text-3xl' /> */}
                                        <img src={Detail} alt="" />
                                        Details
                                    </span>
                                    {activeTab === "details" && (<span className="flex items-center justify-center bg-Red text-whitText rounded-full w-full h-1 -mb-[2px]"></span>)}
                                </span>
                            </button>
                            <button
                                className={`flex items-center gap-2 text-xl font-bold ${activeTab === "reviews" ? "text-Red " : "text-gray-400"
                                    }`}
                                onClick={() => setActiveTab("reviews")}
                            >
                                {/* <FaRegCommentDots className="text-red-500" /> */}
                                <span>
                                    <span className='flex items-center justify-center gap-2 mb-4'>
                                        <img src={Comment} alt="" />
                                        Customer Reviews
                                    </span>
                                    {activeTab === "reviews" && (<span className="flex items-center justify-center bg-Red text-whitText rounded-full w-full h-1 -mb-[5px]"></span>)}
                                </span>
                            </button>
                        </div>

                        {/* Content */}
                        {activeTab === "details" && (
                            <div className="space-y-2">
                                {["About this product", "Properties", "Description"].map((section) => (
                                    <div key={section} className="rounded-lg">
                                        <button
                                            className="bg-[#292B30] flex justify-between w-full text-left text-lg border-b-[0.1px] border-gray-700  px-20 py-2"
                                            onClick={() => toggleSection(section)}
                                        >
                                            <span className='py-4 flex items-center justify-between w-full'>
                                                {section}
                                                <span className="text-gray-400">{openSection === section ? <IoIosArrowUp /> : <IoIosArrowDown />}</span>
                                            </span>
                                        </button>
                                        {openSection === section && (
                                            <p className="mt-2 text-gray-400 text-sm bg-[#212428] px-20 pt-10 pb-16">
                                                This is the content for {section}. You can add more details here.
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === "reviews" && (
                            <div className=" text-gray-400 px-20 py-5">
                                <span className=" text-gray-400 text-sm bg-[#212428]">
                                    <BiSolidQuoteRight className='text-white mb-3' />
                                    <p className='text-sm'>"I can't thank this app enough for saving me during busy days. The variety of restaurants is outstanding, and the discounts are a nice bonus. The app is user-friendly, and the delivery is consistently punctual. They even throw in some exclusive deals now and then. It's my food delivery superhero!"</p>
                                    <span className='flex items-center justify-between my-4'>
                                        <span>
                                            <h6>Bessie Cooper</h6>
                                            <span className='text-xs text-[#6D6D6D]' >Order Jan 24, 2024</span>
                                        </span>
                                        <span className='flex items-center bg-[#2f3137] shadow-xl px-[2px] rounded-md'>
                                            <MdOutlineStar className="text-Red" /> 5.0
                                        </span>
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                </Container>
            </div>
        </div>
    )
}

export default SingleProduct