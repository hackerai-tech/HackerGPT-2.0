alter table chats
    add column if not exists last_shared_message_id UUID REFERENCES messages (id) ON DELETE CASCADE unique;
alter table chats
    add column if not exists shared_at TIMESTAMP WITH TIME ZONE;
alter table chats
    add column if not exists shared_by UUID REFERENCES auth.users (id) ON DELETE CASCADE;