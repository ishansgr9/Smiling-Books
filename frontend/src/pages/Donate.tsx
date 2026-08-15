import React from 'react';
import { Heart, Globe, Award, Sparkles, HeartHandshake } from 'lucide-react';

export const Donate: React.FC = () => {
  return (
    <div className="space-y-16 max-w-4xl mx-auto">

      {/* Header Segment */}
      <div className="text-center space-y-4">
        <span className="px-3.5 py-1.5 bg-red-50 text-red-700 text-xs font-semibold tracking-wider uppercase rounded-full inline-block border border-red-200/50">
          Support Our Cause
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 leading-tight">
          Donate to Akshar Paaul
        </h1>
        <p className="text-sm sm:text-base text-stone-500 leading-relaxed max-w-2xl mx-auto">
          Help us put books in the hands of children and bridge the digital divide in under-resourced communities.
        </p>
      </div>

      {/* Narrative grid details */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Cause Explanation */}
        <div className="bg-white rounded-3xl border border-brand-100/50 p-8 shadow-sm space-y-6">
          <h2 className="font-serif text-xl font-bold text-stone-950">Why Your Support Matters</h2>
          <p className="text-sm text-stone-600 leading-relaxed font-sans font-light">
            Every contribution directly aids Akshar Paaul NGO's educational programs. We work to construct physical "Smiling Books" libraries, print learning books, provide tuition support, and supply digital reading tablets for our digital library extensions.
          </p>

          <div className="space-y-4 pt-2">
            <div className="flex items-start space-x-3 text-sm text-stone-700">
              <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg mt-0.5">
                <Heart size={16} />
              </div>
              <p className="leading-relaxed"><strong>Sponsor Books:</strong> Buy physical storybooks and educational texts for children.</p>
            </div>
            <div className="flex items-start space-x-3 text-sm text-stone-700">
              <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg mt-0.5">
                <Globe size={16} />
              </div>
              <p className="leading-relaxed"><strong>Digital Infrastructure:</strong> Fund cloud servers, storage, and tablets for digital classrooms.</p>
            </div>
            <div className="flex items-start space-x-3 text-sm text-stone-700">
              <div className="p-1.5 bg-brand-50 text-brand-600 rounded-lg mt-0.5">
                <Award size={16} />
              </div>
              <p className="leading-relaxed"><strong>Teaching Support:</strong> Sponsor teacher allowances and learning coordinators.</p>
            </div>
          </div>
        </div>

        {/* Donation Details Box */}
        <div className="bg-gradient-to-br from-brand-900 to-stone-900 text-white rounded-3xl p-8 shadow-md flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-brand-500 rounded text-white">
                <HeartHandshake size={18} />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">Donation Channels</h3>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed font-sans font-light">
              To support the Smiling Books program, you can donate directly using the NGO's bank details or via the online payment portal.
            </p>

            <div className="bg-white/10 rounded-2xl p-5 border border-white/10 space-y-3 font-sans text-xs">
              <h4 className="font-semibold text-brand-300 uppercase tracking-wider text-[10px]">Bank Transfer (India)</h4>
              <div className="grid grid-cols-3 gap-y-1.5 text-stone-300">
                <span className="font-semibold">NGO Name:</span>
                <span className="col-span-2 text-white">AKSHAR PAAUL</span>
                <span className="font-semibold">Bank Name:</span>
                <span className="col-span-2 text-white">State Bank of India</span>
                <span className="font-semibold">Account No:</span>
                <span className="col-span-2 text-white font-mono">329 6779 0808</span>
                <span className="font-semibold">Account Type:</span>
                <span className="col-span-2 text-white">Current Account</span>
                <span className="font-semibold">IFS Code:</span>
                <span className="col-span-2 text-white font-mono">SBIN0030456</span>
                <span className="font-semibold">Branch:</span>
                <span className="col-span-2 text-white leading-relaxed">
                  Bandal Capital, Near PMT Bus Depot, Paud Road, Kothrud, Pune - 411038
                </span>
                <span className="font-semibold">Phone:</span>
                <span className="col-span-2 text-white">020-25285546</span>
              </div>
            </div>
          </div>

          <div className="pt-6">
            <a
              href="https://www.aksharpaaul.org/pages/donate"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm tracking-wider uppercase text-center rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles size={16} />
              <span>Donate Online</span>
            </a>
          </div>
        </div>

      </section>

    </div>
  );
};
export default Donate;
