# Makefile for assets

PYTHON=python
SOX=sox
LAME=lame -t --cbr

AUDIOS=profit.mp3 loss.mp3 kitty.mp3 explosion.mp3 change.mp3 zoom.mp3 intro.mp3 music2.mp3 ending.mp3 start.mp3 brake.mp3 unbrake.mp3

all: $(AUDIOS)

clean:
	-$(RM) $(AUDIOS)

.SUFFIXES: .png .wav .mp3

.wav.mp3:
	$(SOX) $< -t wav - pad 0 0.5 | $(LAME) - $@
