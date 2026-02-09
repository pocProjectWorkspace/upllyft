'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { Button, Card, Input, Textarea, Label } from '@upllyft/ui';

const BENEFITS = [
  { title: 'Make a Difference', description: 'Directly support families navigating crisis situations' },
  { title: 'Training Provided', description: 'Receive comprehensive crisis response training' },
  { title: 'Flexible Schedule', description: 'Volunteer on your own terms with flexible availability' },
  { title: 'Community Impact', description: 'Join a network of dedicated volunteers making real change' },
  { title: 'Professional Growth', description: 'Gain valuable experience in mental health support' },
  { title: 'Certificate of Service', description: 'Receive documentation for your volunteer contributions' },
];

export default function VolunteerPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [availability, setAvailability] = useState('');
  const [skills, setSkills] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <CommunityShell>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Back */}
        <Link href="/crisis" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Crisis Hub
        </Link>

        {/* Hero section */}
        <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-8 sm:p-12 text-white">
          <div className="max-w-xl">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold">Become a Crisis Volunteer</h1>
            <p className="text-teal-100 mt-3 text-lg leading-relaxed">
              Join our network of compassionate volunteers who help families and individuals
              navigate mental health crises. Your time and skills can make a profound difference
              in someone&apos;s life.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Why Volunteer?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BENEFITS.map((benefit) => (
              <Card key={benefit.title} className="p-5" hover>
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{benefit.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Volunteer form */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sign Up to Volunteer</h2>
          <Card className="p-6">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Thank You!</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                  We have received your volunteer application. Our team will review your submission and
                  reach out to you soon with next steps.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setAvailability('');
                    setSkills('');
                  }}
                >
                  Submit Another Application
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="vol-name">Full Name</Label>
                  <Input
                    id="vol-name"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="vol-email">Email Address</Label>
                  <Input
                    id="vol-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="vol-availability">Availability</Label>
                  <Input
                    id="vol-availability"
                    placeholder="e.g., Weekday evenings, Saturday mornings"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    required
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="vol-skills">Skills & Experience</Label>
                  <Textarea
                    id="vol-skills"
                    placeholder="Tell us about any relevant skills, certifications, or experience you have (e.g., counseling, first aid, mental health training)..."
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    rows={4}
                    className="mt-1.5"
                  />
                </div>

                <Button type="submit">
                  Submit Application
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </CommunityShell>
  );
}
