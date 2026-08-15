import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Landmark, Sparkles, HeartHandshake } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="space-y-16 max-w-4xl mx-auto">
      
      {/* Page Header */}
      <div className="text-center space-y-4">
        <span className="px-3.5 py-1.5 bg-brand-50 text-brand-700 text-xs font-semibold tracking-wider uppercase rounded-full inline-block border border-brand-200/50">
          Our Story
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black text-stone-900 leading-tight">
          About Smiling Books
        </h1>
        <p className="text-sm sm:text-base text-stone-500 leading-relaxed max-w-2xl mx-auto">
          An initiative of Akshar Paaul NGO to foster a love for reading and spread knowledge across under-resourced communities.
        </p>
      </div>

      {/* Main Narrative Sections */}
      <section className="bg-white rounded-3xl border border-orange-100/50 p-6 sm:p-10 shadow-sm space-y-10">
        
        {/* NGO Background */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="p-3.5 bg-brand-50 text-brand-600 rounded-2xl shrink-0">
            <Landmark size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold text-stone-950">Akshar Paaul NGO</h2>
            <p className="text-sm text-stone-600 leading-relaxed font-sans font-light">
              Akshar Paaul is dedicated to making education accessible to underprivileged children. Believing that literacy is the foundation of opportunity, our NGO sets up physical learning spaces, tutoring sessions, and libraries to ensure every child gets the step up they deserve.
            </p>
          </div>
        </div>

        {/* Physical Library to Digital Extension */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="p-3.5 bg-brand-50 text-brand-600 rounded-2xl shrink-0">
            <BookOpen size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold text-stone-950">Smiling Books Library</h2>
            <p className="text-sm text-stone-600 leading-relaxed font-sans font-light">
              Our physical library project, "Smiling Books", distributes storybooks and reference materials to children. The Digital Library is a modern extension of this effort, enabling kids, teachers, and parents to browse books and read them on any smartphone, tablet, or laptop.
            </p>
          </div>
        </div>

        {/* Service-Learning & Technology */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="p-3.5 bg-brand-50 text-brand-600 rounded-2xl shrink-0">
            <Sparkles size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold text-stone-950">Service-Learning Initiative</h2>
            <p className="text-sm text-stone-600 leading-relaxed font-sans font-light">
              This digital platform was designed and built as a service-learning project. We wanted to build a real, high-quality full-stack platform using Go (Golang), React, PostgreSQL, and Cloudflare R2 object storage to serve the NGO while ensuring compliance and security.
            </p>
          </div>
        </div>

        {/* Legal & Copyright Commitment */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="p-3.5 bg-brand-50 text-brand-600 rounded-2xl shrink-0">
            <HeartHandshake size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-bold text-stone-950">Copyright Compliance</h2>
            <p className="text-sm text-stone-600 leading-relaxed font-sans font-light">
              Akshar Paaul holds content rights in high regard. We verify that all content uploaded is legally clear. This includes books in the Public Domain (whose copyright protections have expired) and books where authors or publishers have granted explicit digital usage permissions to our NGO.
            </p>
          </div>
        </div>

      </section>

      {/* CTA Box */}
      <section className="bg-gradient-to-br from-brand-900 to-stone-900 rounded-3xl p-8 text-center text-white space-y-6 shadow-md">
        <h2 className="font-serif text-2xl font-bold text-white">Ready to Explore?</h2>
        <p className="text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
          Open our library catalog to search, filter, and read legally authorized books online immediately.
        </p>
        <Link
          to="/library"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-full shadow transition-all"
        >
          <span>Explore Catalog</span>
          <ArrowRight size={14} />
        </Link>
      </section>

    </div>
  );
};
export default About;
