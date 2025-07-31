def tell_story():
    story_lines = [
        "Once upon a time, in a land far, far away, there was a small village nestled in the hills.",
        "The villagers lived peacefully, surrounded by lush forests and clear rivers.",
        "But one day, a mysterious traveler arrived with tales of a hidden treasure buried deep in the woods.",
        "Many villagers were intrigued, but only one brave soul decided to venture into the forest.",
        "This was Elara, the cleverest and most adventurous person in the village.",
        "Armed with only a map and her wits, Elara set off on her quest.",
        "She encountered many challenges along the way: talking animals, enchanted trees, and puzzling riddles.",
        "Each challenge required her to think hard and show courage.",
        "Finally, after days of travel, Elara reached the hidden cave indicated on the map.",
        "Inside, she found not only the treasure but also a wise old sage waiting for her.",
        "The sage revealed that the true treasure was not the gold, but the wisdom she gained during her journey.",
        "Elara returned home, her heart and mind richer than ever before.",
        "Her story became a legend, inspiring others to seek knowledge and adventure."
    ]

    for line in story_lines:
        print(line)
        input("Press Enter to continue...")  # Wait for user to press Enter

if __name__ == "__main__":
    tell_story()
