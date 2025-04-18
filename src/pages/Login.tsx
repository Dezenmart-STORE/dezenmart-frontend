import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { googleIcon, facebookIcon, xIcon } from ".";
import Button from "../components/common/Button";

const Login = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigate("/"); // Redirect to home on success
    }, 1500);
  };

  return (
    <div className="bg-Dark flex justify-center items-center py-10 min-h-screen">
      <div className="flex flex-col items-center w-full max-w-md px-6 md:px-10">
        <h2 className="text-2xl text-white font-bold mb-6">
          Log in or sign up
        </h2>

        <form onSubmit={handleContinue} className="w-full">
          <input
            type="email"
            className={`text-white bg-[#292B30] h-12 w-full border-none outline-none px-4 mb-2 ${
              error ? "border-l-4 border-l-Red" : ""
            }`}
            placeholder="Enter your email"
            value={email}
            onChange={handleEmailChange}
          />

          {error && <p className="text-Red text-sm mb-3 mt-1">{error}</p>}

          <Button
            title={isLoading ? "Please wait..." : "Continue"}
            type="submit"
            className="bg-Red text-white h-12 flex justify-center w-full border-none outline-none text-center mb-5"
            disabled={isLoading}
          />
        </form>

        <div className="w-full">
          <div className="relative flex items-center justify-center mb-5">
            <hr className="border-t border-gray-700 w-full" />
            <span className="text-white text-sm bg-Dark px-3 absolute">OR</span>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3 w-full">
            <Button
              title="Sign in with Google"
              img={googleIcon}
              className="bg-[#292B30] flex justify-center gap-2 text-white h-12 rounded-md w-full border-none"
            />

            <Button
              title="Sign in with Facebook"
              img={facebookIcon}
              className="bg-[#292B30] flex justify-center gap-2 text-white h-12 rounded-md w-full border-none"
            />

            <Button
              title="Sign in with X"
              img={xIcon}
              className="bg-[#292B30] flex justify-center gap-2 text-white h-12 rounded-md w-full border-none mb-6"
            />
          </div>

          {/* Connect Wallet Button */}
          <Button
            title="Connect with a wallet"
            className="bg-[#292B30] text-white h-12 flex justify-center w-full border-none outline-none text-center my-6"
          />
        </div>

        <p className="text-sm text-center font-medium text-white">
          By logging in, you agree to our{" "}
          <Link to="/terms" className="text-[#4FA3FF]">
            Terms of Service
          </Link>{" "}
          &{" "}
          <Link to="/privacy" className="text-[#4FA3FF]">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Login;
