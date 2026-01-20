import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        console.log('[QRScanner] Component mounted');
        const initScanner = async () => {
            // Small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            if (!document.getElementById("qr-reader")) {
                console.error('[QRScanner] div#qr-reader not found in DOM');
                return;
            }

            scannerRef.current = new Html5QrcodeScanner(
                "qr-reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                /* verbose= */ false
            );

            scannerRef.current.render(
                (decodedText) => {
                    console.log('[QRScanner] Scan success:', decodedText);
                    onScan(decodedText);
                    if (scannerRef.current) {
                        scannerRef.current.clear();
                    }
                },
                (errorMessage) => {
                    // ignore errors during scanning
                }
            );
        };

        initScanner();

        return () => {
            console.log('[QRScanner] Cleaning up');
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden relative p-8">
                <button
                    onClick={onClose}
                    className="absolute top-6 left-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-[201]"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900">סרוק קוד מוסך</h2>
                    <p className="text-gray-400 font-bold text-sm">כוון את המצלמה לקוד ה-QR של המוסך</p>
                </div>

                <div id="qr-reader" className="overflow-hidden rounded-2xl border-4 border-black"></div>

                <p className="text-center mt-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    וודא שיש מספיק תאורה
                </p>
            </div>
        </div>
    );
};

export default QRScanner;
