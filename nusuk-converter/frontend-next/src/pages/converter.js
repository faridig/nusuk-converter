// nusuk-converter/frontend-next/src/pages/converter.js
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import { useDropzone } from 'react-dropzone';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';


// --- MODIFICATION 1 : Utiliser un chemin relatif pour le proxy ---
const API_BASE_PATH = '/api-proxy';
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

axios.defaults.withCredentials = true;
// On configure axios pour utiliser le chemin du proxy
axios.defaults.baseURL = API_BASE_PATH;


const docTypes = ['passport', 'photo', 'residence'];
const initialDocumentsState = {
    passport: { preview: '', status: 'pending', croppedFile: null, error: null },
    photo: { preview: '', status: 'pending', croppedFile: null, error: null },
    residence: { preview: '', status: 'pending', croppedFile: null, error: null },
};

// --- ICONES ---
const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1.5 inline-block text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);
const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-brand-green" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
);

// --- FONCTIONS UTILITAIRES (extraites du composant) ---
function getCroppedImg(image, crop, fileName) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, canvas.width, canvas.height);
    return new Promise(resolve => {
        canvas.toBlob(blob => {
            if (blob) {
                blob.name = fileName;
                resolve(blob);
            }
        }, 'image/jpeg');
    });
}

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  const mediaAspect = mediaWidth / mediaHeight;
  let cropWidth, cropHeight;

  if (mediaAspect > aspect) {
    cropHeight = mediaHeight * 0.9;
    cropWidth = cropHeight * aspect;
  } else {
    cropWidth = mediaWidth * 0.9;
    cropHeight = cropWidth / aspect;
  }

  return centerCrop(
    makeAspectCrop({ unit: 'px', width: cropWidth }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

// --- SOUS-COMPOSANTS POUR CHAQUE ETAPE ---

const DocumentUploader = ({ docType, document, onFileChange }) => {
  const { t } = useTranslation('common');
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) onFileChange(docType, { target: { files: acceptedFiles } });
  }, [docType, onFileChange]);

  // --- MODIFICATION POUR L'EXPÉRIENCE MOBILE ---
  // En utilisant 'image/*', le navigateur mobile proposera de choisir entre
  // l'appareil photo et la galerie de photos.
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] }, 
    multiple: false,
    noClick: true,
    noKeyboard: true
  });
  // --- FIN DE LA MODIFICATION ---
  
  const cardStateClasses = {
    pending: 'border-dashed border-gray-300 bg-gray-50/80 hover:border-brand-green hover:bg-white hover:shadow-lg hover:-translate-y-1',
    active: 'border-solid border-brand-green bg-green-50 ring-2 ring-brand-green/50',
    cropped: 'border-solid border-green-500 bg-green-50/50',
  };
  const currentState = isDragActive ? 'active' : document.status;
  
  const docIcons = useMemo(() => ({
    passport: <Image src="/images/passport-example.png" alt={t('converter.preview_alt')} width={70} height={50} className="object-contain opacity-60 group-hover:opacity-90 transition-opacity" priority />,
    photo: <Image src="/images/photo_identité.png" alt={t('converter.preview_alt')} width={50} height={50} className="object-cover rounded-md opacity-60 group-hover:opacity-90 transition-opacity" priority />,
    residence: <Image src="/images/justificatif_domicile.png" alt={t('converter.preview_alt')} width={70} height={50} className="object-contain opacity-60 group-hover:opacity-90 transition-opacity" priority />,
  }), [t]);

  return (
    <div className={`group relative transition-all duration-300 rounded-xl p-4 text-center border-2 ${cardStateClasses[currentState]}`}>
      <h3 className="text-md font-semibold mb-3 text-brand-text-primary">{t(`common.${docType}`)}</h3>
      {document.status === 'cropped' ? (
        <div className="h-40 flex flex-col items-center justify-center space-y-3">
          <CheckCircleIcon />
          <p className="text-lg font-bold text-brand-text-primary">{t('converter.file_ready')}</p>
          <button type="button" onClick={open} className="text-sm text-blue-600 hover:underline">{t('converter.change_file')}</button>
          <input {...getInputProps()} />
        </div>
      ) : (
        <div {...getRootProps()} onClick={open} className="cursor-pointer h-40 flex flex-col items-center justify-center space-y-2">
          <input {...getInputProps()} />
          {docIcons[docType]}
          <p className="text-sm font-medium text-brand-text-secondary mt-2">{isDragActive ? t('converter.dropzone_active') : t('converter.dropzone_prompt')}</p>
          <p className="text-xs text-gray-500">{t(`converter.instruction_${docType}`)}</p>
        </div>
      )}
    </div>
  );
};

const UploadView = ({ documents, handleFileChange, handleProcessFiles, isReadyToPay, error, selectedCurrency, setSelectedCurrency }) => {
    const { t } = useTranslation('common');
    return (
        <div className="space-y-10">
            <header className="bg-gradient-to-r from-brand-green to-teal-600 text-white p-10 rounded-2xl shadow-lg text-center">
                <h1 className="text-4xl font-extrabold">{t('converter.hero_title')}</h1>
                <p className="text-lg text-teal-100 mt-2">{t('converter.hero_subtitle')}</p>
            </header>
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10">
                {error && <p className="text-red-600 text-center mb-6 bg-red-50 p-4 rounded-lg font-medium">{error}</p>}
                
                <div className="mb-10">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
                        <span className="bg-brand-green text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-3">1</span>
                        {t('home.step1_title')}
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {docTypes.map(docType => (<DocumentUploader key={docType} docType={docType} document={documents[docType]} onFileChange={handleFileChange} />))}
                    </div>
                </div>

                <div className="text-center border-t border-gray-200 pt-8 space-y-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                        <span className="bg-brand-green text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-3">2</span>
                        {t('converter.step2_title')}
                    </h2>
                    <div>
                        <label className="text-md font-medium text-gray-600 mr-3">{t('payment.currency_selector_label')}</label>
                        <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green transition">
                            <option value="eur">EUR (€)</option>
                            <option value="usd">USD ($)</option>
                        </select>
                    </div>

                    <div className="flex justify-center">
                        <button onClick={handleProcessFiles} disabled={!isReadyToPay} className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-green to-teal-600 text-white font-bold text-xl px-10 py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md">
                            <span>{selectedCurrency === 'eur' ? t('converter.process_button_eur') : t('converter.process_button_usd')}</span>
                            <Image src="/images/coffee-icon.png" alt={t('common.photo')} width={26} height={26} className="opacity-80" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 pt-2"><LockIcon />{t('converter.secure_payment_info')}</p>
                </div>
            </div>
        </div>
    );
};

const ProcessingView = ({ filesProcessedCount, totalFilesToProcess }) => {
    const { t } = useTranslation('common');
    const progress = totalFilesToProcess > 0 ? (filesProcessedCount / totalFilesToProcess) * 100 : 0;
    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center py-16">
            <h2 className="text-3xl font-bold mb-4">{t('status.preparing_files_title')}</h2>
            <p className="text-gray-600 text-lg">{t('status.processing_files_progress', { current: Math.min(filesProcessedCount, totalFilesToProcess), total: totalFilesToProcess })}</p>
            <div className="w-full bg-gray-200 rounded-full h-3 mt-6 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-green to-teal-500 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

const VerifyingView = () => {
    const { t } = useTranslation('common');
    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center py-16">
            <h2 className="text-3xl font-bold mb-4 animate-pulse text-gray-800">{t('status.verifying_payment')}</h2>
            <p className="text-gray-600 text-lg">{t('status.preparing_files_subtitle')}</p>
        </div>
    );
};

const PaymentView = ({ clientSecret, amount, currency, onSuccessfulPayment }) => {
    const { t } = useTranslation('common');
    const stripeOptions = { clientSecret };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <h1 className="text-4xl font-extrabold text-center mb-8 text-gray-800">{t('payment.title')}</h1>
            <div className="mb-8 p-6 border border-brand-border rounded-lg bg-gray-50 text-center">
                <h2 className="text-lg font-semibold text-brand-text-secondary">{t('payment.order_summary')}</h2>
                <p className="text-4xl font-bold text-brand-text-primary mt-2">
                    {(amount / 100).toLocaleString(undefined, { style: 'currency', currency: currency })}
                </p>
            </div>
            <Elements stripe={stripePromise} options={stripeOptions}>
                <CheckoutForm onSuccessfulPayment={onSuccessfulPayment} />
            </Elements>
        </div>
    );
};

const CheckoutForm = ({ onSuccessfulPayment }) => {
    const { t } = useTranslation('common');
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!stripe) return;
        const clientSecret = new URLSearchParams(window.location.search).get('payment_intent_client_secret');
        if (!clientSecret) return;
        stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
            switch (paymentIntent.status) {
                case 'succeeded': onSuccessfulPayment(); break;
                case 'processing': setMessage(t('payment.processing_message')); break;
                case 'requires_payment_method': setMessage(t('payment.failed_message')); break;
                default: setMessage(t('payment.unexpected_error')); break;
            }
        });
    }, [stripe, onSuccessfulPayment, t]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setIsLoading(true);
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: `${window.location.origin}${window.location.pathname}` },
        });
        if (error.type === "card_error" || error.type === "validation_error") {
            setMessage(error.message);
        } else {
            setMessage(t('payment.unexpected_error'));
        }
        setIsLoading(false);
    };

    return (
        <form id="payment-form" onSubmit={handleSubmit}>
            <PaymentElement id="payment-element" options={{ layout: "tabs" }} />
            <button disabled={isLoading || !stripe || !elements} className="w-full mt-6 bg-gradient-to-r from-brand-green to-teal-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:opacity-90 transition-opacity disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed">
                {isLoading ? t('common.processing') : t('payment.pay_button')}
            </button>
            {message && <div className="mt-4 text-red-600 text-center">{message}</div>}
        </form>
    );
};


// --- MODIFICATION 2 : Mettre à jour le composant DownloadView ---
const DownloadView = ({ processedFiles, sessionId, handleReturnHome, error }) => { 
    const { t } = useTranslation('common');
    
    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center py-8">
            <h1 className="text-4xl font-extrabold text-brand-green mb-3">{t('status.download_ready_title')}</h1>
            <p className="text-gray-600 text-lg mb-10">{t('status.download_ready_subtitle')}</p>
            {error && <p className="text-red-600 mb-4 bg-red-50 p-4 rounded-lg">{error}</p>}
            <div className="space-y-4 max-w-md mx-auto">
                {Object.entries(processedFiles).map(([docType, file]) => (
                    <a 
                        key={file.id}
                        // Le href utilise maintenant le chemin relatif du proxy
                        href={`${API_BASE_PATH}/download/${sessionId}/${file.id}`}
                        download={file.name}
                        className="flex items-center justify-between w-full bg-gray-100 hover:bg-gray-200 text-brand-text-primary font-semibold py-4 px-6 rounded-lg transition-colors"
                    >
                        <span>{t(`common.${docType}`)}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </a>
                ))}
            </div>
            <button onClick={handleReturnHome} className="mt-12 text-md text-gray-500 hover:underline">{t('status.back_to_home')}</button>
        </div>
    );
};


// --- COMPOSANT PRINCIPAL ---
const ConverterPage = () => {
    const router = useRouter();
    const { locale } = router;
    const { t } = useTranslation('common');
    
    // États de l'application
    const [sessionId, setSessionId] = useState(null);
    const [documents, setDocuments] = useState(initialDocumentsState);
    const [processedFiles, setProcessedFiles] = useState({});
    const [error, setError] = useState('');
    const [appState, setAppState] = useState('uploading');
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [startupError, setStartupError] = useState('');

    // États pour le recadrage
    const [croppingDocType, setCroppingDocType] = useState(null);
    const [crop, setCrop] = useState();
    const imgRef = useRef(null);

    // États pour le paiement et le traitement
    const [totalFilesToProcess, setTotalFilesToProcess] = useState(0);
    const [filesProcessedCount, setFilesProcessedCount] = useState(0);
    const [initialProcessedCount, setInitialProcessedCount] = useState(0);
    const [initialDocTypes, setInitialDocTypes] = useState([]);
    const [clientSecret, setClientSecret] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState('eur');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentCurrency, setPaymentCurrency] = useState('eur');

    const isReadyToPay = useMemo(() => Object.values(documents).some(doc => doc.status === 'cropped'), [documents]);

    const onImageLoad = useCallback((e) => {
        const { width, height } = e.currentTarget;
        const aspect = croppingDocType === 'photo' ? 1 : 16 / 9;
        setCrop(centerAspectCrop(width, height, aspect));
    }, [croppingDocType]);

    // --- LOGIQUE METIER (dans des `useEffect` et `useCallback`) ---

    useEffect(() => {
        // On retire la vérification de API_URL car on n'utilise plus la variable d'environnement ici
        if (!STRIPE_PUBLIC_KEY) { setStartupError(t('errors.stripe_key_missing')); setIsLoadingSession(false); return; }
    }, [t]);

    useEffect(() => {
        if (startupError) return;
        const initializeSession = async () => {
            try {
                const existingSessionId = sessionStorage.getItem('nusuk_session_id');
                if (existingSessionId) {
                    setSessionId(existingSessionId);
                    const { data } = await axios.get(`/session-status/${existingSessionId}`);
                    setInitialProcessedCount(data.processed_count);
                    setInitialDocTypes(data.doc_types || []);
                } else {
                    const res = await axios.post(`/create-session`);
                    const newSessionId = res.data.session_id;
                    sessionStorage.setItem('nusuk_session_id', newSessionId);
                    setSessionId(newSessionId);
                    setInitialProcessedCount(0);
                    setInitialDocTypes([]);
                }
            } catch (err) { setError(t('errors.server_unavailable')); } 
            finally { setIsLoadingSession(false); }
        };
        initializeSession();
    }, [t, startupError]);

    useEffect(() => { if (locale) { setSelectedCurrency(locale === 'en' ? 'usd' : 'eur'); } }, [locale]);

    useEffect(() => {
        const paymentIntentId = new URLSearchParams(window.location.search).get('payment_intent');
        const redirectStatus = new URLSearchParams(window.location.search).get('redirect_status');

        if (paymentIntentId && redirectStatus === 'succeeded' && sessionId) {
            setAppState('verifying');
            
            const verifyAndFetch = async () => {
                try {
                    const response = await axios.post('/verify-payment', { payment_intent_id: paymentIntentId });
                    setProcessedFiles(response.data.files);
                    setAppState('download');
                } catch (err) {
                    setError(t('errors.payment_verification_failed'));
                    setAppState('uploading');
                } finally {
                    window.history.replaceState(null, '', window.location.pathname);
                }
            };

            verifyAndFetch();
        }
    }, [sessionId, t]);
    
    useEffect(() => {
        const clientSecretFromUrl = new URLSearchParams(window.location.search).get('payment_intent_client_secret');
        if (clientSecretFromUrl && !clientSecret) { 
            setClientSecret(clientSecretFromUrl); 
            setAppState('payment'); 
        }
    }, [clientSecret]);
    
    const handleSuccessfulPayment = useCallback(() => {
        setAppState('verifying');
        window.history.replaceState(null, '', window.location.pathname);
    }, []);
    
    const handleReturnHome = useCallback((e) => {
        e.preventDefault();
        sessionStorage.removeItem('nusuk_session_id');
        setSessionId(null);
        setDocuments(initialDocumentsState);
        setProcessedFiles({});
        setError('');
        setAppState('uploading');
        setClientSecret('');
        setInitialProcessedCount(0);
        router.push('/');
    }, [router]);

    const handleFileChange = useCallback((docType, event) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setDocuments(prev => ({ ...prev, [docType]: { ...initialDocumentsState[docType], preview: URL.createObjectURL(file), error: null } }));
            setCrop(undefined);
            setCroppingDocType(docType);
        }
    }, []);
    
    const handleCropSave = useCallback(async () => {
        if (!croppingDocType || !crop?.width || !imgRef.current) return;
        const croppedBlob = await getCroppedImg(imgRef.current, crop, `${croppingDocType}-cropped.jpg`);
        setDocuments(prev => ({ ...prev, [croppingDocType]: { ...prev[croppingDocType], croppedFile: croppedBlob, preview: URL.createObjectURL(croppedBlob), status: 'cropped' } }));
        setCroppingDocType(null);
    }, [croppingDocType, crop]);

    const handleProcessFiles = useCallback(async () => {
        const filesToProcess = Object.entries(documents).filter(([_, doc]) => doc.status === 'cropped' && doc.croppedFile);
        if (filesToProcess.length === 0) { setError(t('errors.at_least_one_file')); return; }
        setTotalFilesToProcess(filesToProcess.length);
        setFilesProcessedCount(0); setAppState('processing'); setError('');
        
        const uploadPromises = filesToProcess.map(([type, doc]) => {
            const formData = new FormData();
            formData.append('file', doc.croppedFile, doc.croppedFile.name);
            formData.append('doc_type', type);
            formData.append('session_id', sessionId);
            return axios.post(`/process-image`, formData);
        });
        
        try {
            await Promise.all(uploadPromises);
            
            const typesInThisBatch = filesToProcess.map(([type]) => type);
            const newTypesCount = typesInThisBatch.filter(type => !initialDocTypes.includes(type)).length;
            const expectedFileCount = initialProcessedCount + newTypesCount;
            
            const finalStatus = await new Promise((resolve, reject) => {
                let attempts = 0; const maxAttempts = 20; const interval = 3000;
                const checkStatus = async () => {
                    try {
                        const { data } = await axios.get(`/session-status/${sessionId}`);
                        setFilesProcessedCount(data.processed_count);
                        if (data.processed_count >= expectedFileCount) { 
                            resolve(data); 
                        } 
                        else if (attempts >= maxAttempts) { reject(new Error(t('errors.processing_took_too_long'))); } 
                        else { attempts++; setTimeout(checkStatus, interval); }
                    } catch (err) { reject(new Error(t('errors.file_status_check_failed'))); }
                };
                checkStatus();
            });
            
            setInitialProcessedCount(finalStatus.processed_count);
            setInitialDocTypes(finalStatus.doc_types || []);

            const { data } = await axios.post(`/create-payment-intent`, { session_id: sessionId, currency: selectedCurrency });
            setClientSecret(data.clientSecret);
            setPaymentAmount(data.amount);
            setPaymentCurrency(data.currency);
            setAppState('payment');
        } catch(err) {
            const serverMsg = err.response?.data?.message || err.message || t('errors.server_communication_failed');
            setError(`${t('errors.process_failed')} ${serverMsg}`);
            setAppState('uploading');
        }
    }, [documents, sessionId, initialProcessedCount, selectedCurrency, t, initialDocTypes]);
    
    // --- RENDU CONDITIONNEL ---

    const renderErrorScreen = (message) => (<div className="flex items-center justify-center min-h-screen bg-gray-100"><div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md"><h1 className="text-2xl font-bold text-red-600 mb-4">{t('common.error')}</h1><p className="text-gray-600">{message}</p></div></div>);
    if (startupError) return renderErrorScreen(startupError);
    if (isLoadingSession) return (<div className="flex items-center justify-center min-h-screen bg-gray-100"><p className="text-xl text-gray-500 animate-pulse">{t('status.initializing')}</p></div>);
    if (!sessionId) return renderErrorScreen(error || t('errors.server_unavailable'));

    const renderContent = () => {
            switch (appState) {
                case 'processing': return <ProcessingView filesProcessedCount={filesProcessedCount} totalFilesToProcess={totalFilesToProcess} />;
                case 'verifying': return <VerifyingView />;
                case 'payment': return clientSecret ? <PaymentView clientSecret={clientSecret} amount={paymentAmount} currency={paymentCurrency} onSuccessfulPayment={handleSuccessfulPayment} /> : <VerifyingView />;
                // --- MODIFICATION 3 : La prop "handleDownload" est retirée de l'appel ---
                case 'download': return <DownloadView processedFiles={processedFiles} sessionId={sessionId} handleReturnHome={handleReturnHome} error={error} />;
                case 'uploading':
                default:
                    return <UploadView documents={documents} handleFileChange={handleFileChange} handleProcessFiles={handleProcessFiles} isReadyToPay={isReadyToPay} error={error} selectedCurrency={selectedCurrency} setSelectedCurrency={setSelectedCurrency} />;
            }
        };
    
    return (
      <>
        <Head><title>{t('converter.metaTitle')}</title></Head>
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10"><LanguageSwitcher /></div>
        <main className="bg-gradient-to-b from-teal-50 via-white to-white min-h-screen flex items-center justify-center p-4 font-sans text-brand-text-primary">
          <div className="relative w-full max-w-4xl mx-auto">
            {croppingDocType && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-xl max-w-3xl w-full shadow-2xl">
                    <h2 className="text-2xl font-bold mb-4">{t('converter.crop_modal_title')} {t(`common.${croppingDocType}`)}</h2>
                    <ReactCrop crop={crop} onChange={c => setCrop(c)} aspect={croppingDocType === 'photo' ? 1 : undefined} ruleOfThirds>
                        <img ref={imgRef} src={documents[croppingDocType].preview} alt={t('converter.crop_modal_source_alt')} style={{maxHeight: '70vh'}} onLoad={onImageLoad} />
                    </ReactCrop>
                    <div className="flex justify-end mt-6 space-x-4">
                        <button onClick={() => setCroppingDocType(null)} className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors">{t('common.cancel')}</button>
                        <button onClick={handleCropSave} className="px-6 py-2 bg-brand-green text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">{t('converter.crop_modal_confirm')}</button>
                    </div>
                </div>
              </div>
            )}
            {renderContent()}
          </div>
        </main>
      </>
    );
};

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default ConverterPage;