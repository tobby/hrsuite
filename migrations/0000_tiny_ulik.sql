CREATE TABLE "appraisal_cycles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"template_id" varchar,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"self_weight" integer DEFAULT 10 NOT NULL,
	"peer_weight" integer DEFAULT 30 NOT NULL,
	"manager_weight" integer DEFAULT 60 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appraisal_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appraisal_id" varchar NOT NULL,
	"reviewer_id" varchar NOT NULL,
	"reviewer_type" text NOT NULL,
	"overall_comment" text,
	"submitted_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appraisal_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appraisals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"overall_rating" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidate_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" varchar NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar
);
--> statement-breakpoint
CREATE TABLE "candidate_assessments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" varchar NOT NULL,
	"assessor_id" varchar NOT NULL,
	"category" text NOT NULL,
	"score" integer NOT NULL,
	"comments" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidate_communications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" varchar NOT NULL,
	"direction" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"sent_by" varchar
);
--> statement-breakpoint
CREATE TABLE "candidate_interviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" varchar NOT NULL,
	"interviewer_id" varchar NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"type" text NOT NULL,
	"round" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"meeting_link" text,
	"meeting_location" text,
	"notes" text,
	"rating" integer,
	"strengths" text,
	"weaknesses" text,
	"recommendation" text,
	"decision" text,
	"feedback_submitted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "candidate_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" varchar NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"created_by" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"job_id" varchar NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"location" text,
	"linkedin_url" text,
	"gender" text,
	"cover_letter" text,
	"source" text DEFAULT 'website' NOT NULL,
	"resume_file_name" text,
	"resume_file_url" text,
	"website" text,
	"ndpa_consent" boolean,
	"assigned_manager_id" varchar,
	"stage" text DEFAULT 'new' NOT NULL,
	"rejection_reason" text,
	"applied_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"logo_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_holidays" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competencies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competency_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competency_id" varchar NOT NULL,
	"question_text" text NOT NULL,
	"question_type" text DEFAULT 'rating' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"head_id" varchar
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar,
	"company_id" varchar NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"department_id" varchar,
	"position" text NOT NULL,
	"manager_id" varchar,
	"hire_date" date,
	"date_of_birth" date,
	"home_address" text,
	"profile_image_url" text,
	"status" text DEFAULT 'invited' NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"password_hash" text,
	"invite_token" varchar,
	"invite_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "employees_email_unique" UNIQUE("email"),
	CONSTRAINT "employees_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "feedback_ratings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feedback_id" varchar NOT NULL,
	"question_id" varchar NOT NULL,
	"rating" integer,
	"text_response" text
);
--> statement-breakpoint
CREATE TABLE "hr_queries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"type" text DEFAULT 'query' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"employee_id" varchar NOT NULL,
	"issued_by" varchar NOT NULL,
	"assigned_to" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hr_query_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_id" varchar NOT NULL,
	"comment_id" varchar,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hr_query_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_id" varchar NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar NOT NULL,
	"is_internal" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hr_query_timeline" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_id" varchar NOT NULL,
	"action" text NOT NULL,
	"details" text,
	"actor_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_postings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"requirements" text,
	"responsibilities" text,
	"hiring_process" text,
	"application_fields" text,
	"department_id" varchar NOT NULL,
	"assigned_manager_id" varchar,
	"location" text NOT NULL,
	"location_type" text DEFAULT 'on-site' NOT NULL,
	"employment_type" text NOT NULL,
	"experience_years" integer DEFAULT 0 NOT NULL,
	"salary_min" integer,
	"salary_max" integer,
	"number_of_openings" integer DEFAULT 1 NOT NULL,
	"application_deadline" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ld_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"course_title" text NOT NULL,
	"training_provider" text NOT NULL,
	"course_type" text NOT NULL,
	"course_type_other" text,
	"delivery_mode" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"course_link" text,
	"learning_objectives" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"manager_comment" text,
	"manager_id" varchar,
	"assigned_to" varchar,
	"admin_comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_balances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"leave_type_id" varchar NOT NULL,
	"total_days" integer NOT NULL,
	"used_days" integer DEFAULT 0 NOT NULL,
	"remaining_days" integer NOT NULL,
	"year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"leave_type_id" varchar NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approver_id" varchar,
	"approver_comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"default_days" integer NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"purpose" text NOT NULL,
	"amount_requested" integer NOT NULL,
	"repayment_duration" integer NOT NULL,
	"monthly_installment" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_comment" text,
	"reviewed_by" varchar,
	"assigned_to" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "peer_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" varchar NOT NULL,
	"reviewee_id" varchar NOT NULL,
	"reviewer_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recruitment_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"template_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"assignment_type" text DEFAULT 'individual' NOT NULL,
	"target_employee_id" varchar,
	"target_department_id" varchar,
	"assigned_by_id" varchar NOT NULL,
	"items" text NOT NULL,
	"due_date" timestamp,
	"priority" text DEFAULT 'medium' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"item_id" text NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp,
	"acknowledged_by_name" text
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"department_id" varchar,
	"default_assignment_type" text DEFAULT 'individual',
	"is_default" boolean DEFAULT false NOT NULL,
	"items" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"section_id" varchar,
	"competency_id" varchar,
	"question_text" text NOT NULL,
	"question_type" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"section" text,
	"reviewer_types" text[] DEFAULT ARRAY['self','peer','manager']
);
--> statement-breakpoint
CREATE TABLE "template_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "IDX_user_sessions_expire" ON "user_sessions" USING btree ("expire");