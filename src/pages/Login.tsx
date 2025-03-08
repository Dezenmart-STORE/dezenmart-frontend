import { Link } from "react-router-dom"
import { googleIcon, facebookIcon, xIcon } from "."
import Button from "../ui/Button"


const Login = () => {
    return (
        <div className='bg-Dark flex justify-center items-center py-10 h-[100vh]'>

            <div className="flex flex-col items-center px-10 md:px-0 lg:px-0">
                <h2 className="text-2xl text-white font-bold mb-5">Log in or sign up</h2>
                <input type="text" className="text-white bg-[#292B30] h-11 rounded-none w-[360px] md:w-[410px] lg:w-[410px] border-none outline-none px-3 mb-3" placeholder="Enter your email" />

                <Button title="Continue" icon="" path="" className="bg-Red text-white h-11 rounded-none flex justify-center w-[360px] md:w-[410px] lg:w-[410px] border-none outline-none text-center mb-3" />

                {/* sign in with google button */}
                <Button title="Sign in with Google" icon="" img={googleIcon} path="" className="bg-[#292B30] flex justify-center gap-2 text-white h-11 rounded-md w-[360px] md:w-[410px] lg:w-[410px] border-none outline-none text-center text-sm mb-3" />

                {/* sign in with facebook button */}
                <Button title="Sign in with Facebook" icon="" img={facebookIcon} path="" className="bg-[#292B30] flex justify-center gap-2 text-white h-11 rounded-md w-[360px] md:w-[410px] lg:w-[410px] border-none outline-none text-center mb-3" />

                {/* sign in with twitter button */}
                <Button title="Sign in with Facebook" icon="" img={xIcon} path="" className="bg-[#292B30] flex justify-center gap-2 text-white h-11 rounded-md w-[360px] md:w-[410px] lg:w-[410px] border-none outline-none text-center mb-6" />

                {/* divider  */}
                <div className="flex items-center justify-center gap-5">
                    <span className="h-[1px] bg-white w-[150px]"></span>
                    <span className="text-white text-xl"> OR</span>
                    <span className="h-[1px] bg-white w-[150px]"></span>
                </div>

                {/* continue with a wallet  */}
                <Button title="Connect with a wallet" icon="" path="" className="bg-[#292B30] text-white h-11 rounded-none flex justify-center w-[360px] md:w-[410px] lg:w-[410px] border-none outline-none text-center my-8" />


                <span className="text-md text-center font-bolder text-white">By logging in, you agree to our <Link to="" className="text-[#4FA3FF]">Terms of <br />Service</Link> & <Link to="" className="text-[#4FA3FF]"> Privacy Policy.</Link></span>

            </div>
        </div>
    )
}

export default Login