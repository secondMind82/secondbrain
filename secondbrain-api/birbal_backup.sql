--
-- PostgreSQL database dump
--

\restrict qkBVIgIQmJGIEAg0Nji44vObSdubyYgXk6mk5L1mQDhbqvyLAJbgkBAUKqJgF6W

-- Dumped from database version 16.15 (Homebrew)
-- Dumped by pg_dump version 16.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: EntityType; Type: TYPE; Schema: public; Owner: mufizansari
--

CREATE TYPE public."EntityType" AS ENUM (
    'PERSON',
    'COMPANY'
);


ALTER TYPE public."EntityType" OWNER TO mufizansari;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Entity; Type: TABLE; Schema: public; Owner: mufizansari
--

CREATE TABLE public."Entity" (
    id text NOT NULL,
    name text NOT NULL,
    type public."EntityType" NOT NULL,
    description text,
    avatar text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Entity" OWNER TO mufizansari;

--
-- Name: Note; Type: TABLE; Schema: public; Owner: mufizansari
--

CREATE TABLE public."Note" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public."Note" OWNER TO mufizansari;

--
-- Name: Timeline; Type: TABLE; Schema: public; Owner: mufizansari
--

CREATE TABLE public."Timeline" (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "eventDate" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text NOT NULL,
    "showOnCalendar" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Timeline" OWNER TO mufizansari;

--
-- Name: TimelineEntity; Type: TABLE; Schema: public; Owner: mufizansari
--

CREATE TABLE public."TimelineEntity" (
    "timelineId" text NOT NULL,
    "entityId" text NOT NULL
);


ALTER TABLE public."TimelineEntity" OWNER TO mufizansari;

--
-- Name: User; Type: TABLE; Schema: public; Owner: mufizansari
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    avatar text,
    bio text,
    phone text,
    username text
);


ALTER TABLE public."User" OWNER TO mufizansari;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: mufizansari
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO mufizansari;

--
-- Data for Name: Entity; Type: TABLE DATA; Schema: public; Owner: mufizansari
--

COPY public."Entity" (id, name, type, description, avatar, "userId", "createdAt", "updatedAt") FROM stdin;
cmtjqxwii0001r13d2b4hixjq	shaafansari	PERSON	\N	\N	cmtija89t0000s55ylpe11548	2026-09-02 07:00:07.001	2026-09-02 07:00:07.001
cmtjrgcr00005r13dhlr8fizh	today	PERSON	\N	\N	cmtija89t0000s55ylpe11548	2026-09-02 07:14:27.853	2026-09-02 07:14:27.853
\.


--
-- Data for Name: Note; Type: TABLE DATA; Schema: public; Owner: mufizansari
--

COPY public."Note" (id, title, content, pinned, "createdAt", "updatedAt", "userId") FROM stdin;
\.


--
-- Data for Name: Timeline; Type: TABLE DATA; Schema: public; Owner: mufizansari
--

COPY public."Timeline" (id, title, description, "eventDate", "createdAt", "updatedAt", "userId", "showOnCalendar") FROM stdin;
cmtjqxwis0003r13dnbl9mcf1	shaafansari	Today is event at 5 pm	2026-09-02 07:00:07.011	2026-09-02 07:00:07.012	2026-09-02 07:00:07.012	cmtija89t0000s55ylpe11548	f
cmtjrgcr20007r13dqzan7djw	today	is meeting	2026-09-02 07:14:27.854	2026-09-02 07:14:27.854	2026-09-02 07:14:27.854	cmtija89t0000s55ylpe11548	f
cmtjrn00w0009r13d37qhua5q	today	is meeting	2026-09-02 07:19:37.952	2026-09-02 07:19:37.953	2026-09-02 07:19:37.953	cmtija89t0000s55ylpe11548	f
cmtju1coh0001r19eftyyizb5	shaafansari	met him today	2026-09-02 08:26:46.768	2026-09-02 08:26:46.769	2026-09-02 08:26:46.769	cmtija89t0000s55ylpe11548	f
cmtju1vlr0003r19egjed2u76	shaafansari	met him tomorrow	2026-09-02 08:27:11.294	2026-09-02 08:27:11.295	2026-09-02 08:27:11.295	cmtija89t0000s55ylpe11548	f
cmtk2rqp90001r108nm1esa82	Wedding ceremony 	Its very important to go 	2026-09-03 00:00:00	2026-09-02 12:31:14.924	2026-09-02 12:31:14.924	cmtija89t0000s55ylpe11548	t
cmtl7m2q90001r11h4lqxafyw	shaafansari	met him yesterday	2026-09-03 07:34:34.832	2026-09-03 07:34:34.833	2026-09-03 07:34:34.833	cmtija89t0000s55ylpe11548	f
\.


--
-- Data for Name: TimelineEntity; Type: TABLE DATA; Schema: public; Owner: mufizansari
--

COPY public."TimelineEntity" ("timelineId", "entityId") FROM stdin;
cmtjqxwis0003r13dnbl9mcf1	cmtjqxwii0001r13d2b4hixjq
cmtjrgcr20007r13dqzan7djw	cmtjrgcr00005r13dhlr8fizh
cmtjrn00w0009r13d37qhua5q	cmtjrgcr00005r13dhlr8fizh
cmtju1coh0001r19eftyyizb5	cmtjqxwii0001r13d2b4hixjq
cmtju1vlr0003r19egjed2u76	cmtjqxwii0001r13d2b4hixjq
cmtk2rqp90001r108nm1esa82	cmtjqxwii0001r13d2b4hixjq
cmtl7m2q90001r11h4lqxafyw	cmtjqxwii0001r13d2b4hixjq
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: mufizansari
--

COPY public."User" (id, "fullName", email, password, "createdAt", "updatedAt", avatar, bio, phone, username) FROM stdin;
cmtija89t0000s55ylpe11548	shaaf	ansarishaaf9@gmail.com	$2b$10$v/pNZ6eIlSIfdmSFovBTSeyM.j2YGX1MGiQ9mzPyXEsKHJb19j20C	2026-09-01 10:37:59.009	2026-09-01 10:37:59.009	\N	\N	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: mufizansari
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
7f163d7d-0d36-43b4-b11e-7a699e7855af	b0d4092a0809a265ee9a501c941dcaba0310b4ab54ed41f70670bc11c77899eb	2026-09-01 15:22:26.104325+05:30	20260728104156_init	\N	\N	2026-09-01 15:22:26.097348+05:30	1
c71e7aec-1e7a-4ad3-8525-8f41bd23581a	109a99ff784681108bd04c4989b0ea339dcec83262eba2938942790d1d828e98	2026-09-01 15:22:26.110289+05:30	20260730125433_add_notes	\N	\N	2026-09-01 15:22:26.104661+05:30	1
d82c6945-01aa-4242-aa14-c4b15ccb1404	04f0be434894640958f0a66533f22389aebfd0d3398bfc0043888a3fdf76ffad	2026-09-01 15:22:26.112492+05:30	20260803060823_add_profile_fields	\N	\N	2026-09-01 15:22:26.110612+05:30	1
f1328a53-72a9-473f-a26c-0ca5b329004c	abfaf0df85fa141063c38d3b2f508895dd9b8a60c06741a852e7947ac28112be	2026-09-01 15:22:26.11725+05:30	20260803125343_add_entities	\N	\N	2026-09-01 15:22:26.112836+05:30	1
3255c258-db21-40a3-88e7-431442413768	5e12835db5a1712895e4108a18dd3136b01d3a3a0035908545b8d0001c1417c6	2026-09-01 15:22:26.125216+05:30	20260805122034_add_timeline_module	\N	\N	2026-09-01 15:22:26.117566+05:30	1
fa764a6b-21c9-4760-830e-5a9986faa76a	6dc5eae693c06d7d3bb07071d7bf41803f7544d113772c2b1647dcbe2b1e52e7	2026-09-01 15:22:26.126637+05:30	20260810060820_add_show_on_calendar	\N	\N	2026-09-01 15:22:26.125556+05:30	1
\.


--
-- Name: Entity Entity_pkey; Type: CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."Entity"
    ADD CONSTRAINT "Entity_pkey" PRIMARY KEY (id);


--
-- Name: Note Note_pkey; Type: CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_pkey" PRIMARY KEY (id);


--
-- Name: TimelineEntity TimelineEntity_pkey; Type: CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."TimelineEntity"
    ADD CONSTRAINT "TimelineEntity_pkey" PRIMARY KEY ("timelineId", "entityId");


--
-- Name: Timeline Timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."Timeline"
    ADD CONSTRAINT "Timeline_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: mufizansari
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: mufizansari
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Entity Entity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."Entity"
    ADD CONSTRAINT "Entity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Note Note_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."Note"
    ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimelineEntity TimelineEntity_entityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."TimelineEntity"
    ADD CONSTRAINT "TimelineEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES public."Entity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimelineEntity TimelineEntity_timelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."TimelineEntity"
    ADD CONSTRAINT "TimelineEntity_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES public."Timeline"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Timeline Timeline_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: mufizansari
--

ALTER TABLE ONLY public."Timeline"
    ADD CONSTRAINT "Timeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict qkBVIgIQmJGIEAg0Nji44vObSdubyYgXk6mk5L1mQDhbqvyLAJbgkBAUKqJgF6W

