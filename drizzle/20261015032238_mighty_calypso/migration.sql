ALTER TABLE "actor" ADD CONSTRAINT "actor_text_length" CHECK (char_length("appearance") <= 500
        and char_length("personality") <= 500
        and char_length("background") <= 1000);