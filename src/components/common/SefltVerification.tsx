"use client";
import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { FullLogo } from "../../pages";
import { v4 as uuidv4 } from "uuid";
import SelfQRcodeWrapper from "@selfxyz/qrcode";
import { getUniversalLink, SelfAppBuilder } from "@selfxyz/core";
import type { SelfApp } from "@selfxyz/common/utils/appType";
import { useAuth } from "../../context/AuthContext";
import { useUserManagement } from "../../utils/hooks/useUser";

interface props {
  isOpen: boolean;
  onClose: () => void;
}
function SefltVerification({ isOpen, onClose }: props) {
  const { user } = useAuth();
  const {
    selectedUser,
    formattedSelectedUser,
    isLoading,
    error,
    fetchProfile,
    isError,
    updateProfile,
  } = useUserManagement();
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);
  useEffect(() => {
    const id = uuidv4();
    // user?._id || selectedUser?._id;
    setSelfApp(
      new SelfAppBuilder({
        appName: "Dezenmart",
        scope: "dezenmart-scope",
        endpoint: import.meta.env.VITE_API_URL,
        endpointType: "https",
        logoBase64: FullLogo,
        userId: id,
        // chainID: 44787,
        disclosures: {
          name: true,
          nationality: true,
          passport_number: true,
          expiry_date: true,
          issuing_state: true,
          minimumAge: 18,
        },
      }).build() as SelfApp
    );
  }, [user?._id]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Passport Verification">
      {!selfApp ? (
        <p className="text-sm text-gray-400 mb-2">
          Unable to verify via the Self app at the moment, please check back
          after some time.
        </p>
      ) : isMobile ? (
        <div>
          <p className="text-sm text-gray-400 mb-2">
            You're on mobile. Tap the button below to verify via the Self app.
          </p>
          <a
            href={getUniversalLink(selfApp)}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto inline-block bg-Red text-white text-sm font-medium px-4 py-2 rounded-lg transition hover:bg-[#e02d37]"
          >
            Verify Identity via Self App
          </a>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-400 mb-2">
            Scan the QR code below to verify your account.
          </p>
          <SelfQRcodeWrapper
            selfApp={selfApp as any}
            onSuccess={async () => {
              await updateProfile({ isVerified: true }, false);
              await fetchProfile(false, true);
            }}
            onError={() => {
              console.error("Error scanning QR code");
            }}
            size={300}
            darkMode={false}
          />
        </div>
      )}
    </Modal>
  );
}

export default SefltVerification;
