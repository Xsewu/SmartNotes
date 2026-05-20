-- Utworzenie nowego bucketa
INSERT INTO storage.buckets (id, name, "public") 
VALUES ('uploads', 'uploads', true);

-- Publiczny dostęp do odczytu obiektów
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT USING (bucket_id = 'uploads');

-- Dostęp do wgrywania plików dla zalogowanych użytkowników
CREATE POLICY "Auth Uploads" ON storage.objects 
FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');