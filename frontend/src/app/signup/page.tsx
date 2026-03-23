import dynamic from 'next/dynamic';

const SignupForm = dynamic(() => import('@/components/auth/signup-form'), { ssr: false });

export default function SignupPage() {
  return <SignupForm />;
}
