use ringbuf::traits::{Consumer, Observer, Producer, Split};
use ringbuf::{HeapCons, HeapProd, HeapRb};

/// Lock-free Single-Producer Single-Consumer (SPSC) Audio Buffer Pool.
/// Decouples the real-time audio thread (producer) from DSP/resampling/VAD worker thread (consumer).
pub struct AudioBufferPool {
    producer: HeapProd<f32>,
    consumer: HeapCons<f32>,
}

impl AudioBufferPool {
    /// Creates a new buffer pool with the given sample capacity.
    /// Default standard is 192,000 samples (~4 seconds at 48kHz stereo).
    pub fn new(capacity: usize) -> Self {
        let rb = HeapRb::<f32>::new(capacity);
        let (producer, consumer) = rb.split();
        Self { producer, consumer }
    }

    /// Splits the buffer pool into separate producer and consumer handles.
    pub fn split(self) -> (AudioProducer, AudioConsumer) {
        (
            AudioProducer { inner: self.producer },
            AudioConsumer { inner: self.consumer },
        )
    }
}

pub struct AudioProducer {
    inner: HeapProd<f32>,
}

// Send safety for transferring to audio capture thread
unsafe impl Send for AudioProducer {}

impl AudioProducer {
    /// Push a single sample into the ring buffer.
    /// Returns Ok(()) if pushed, Err(sample) if full.
    pub fn push(&mut self, sample: f32) -> Result<(), f32> {
        self.inner.try_push(sample)
    }

    /// Push a slice of samples into the ring buffer.
    /// Returns the number of samples actually written.
    pub fn push_slice(&mut self, samples: &[f32]) -> usize {
        self.inner.push_slice(samples)
    }

    /// Returns the remaining free capacity in the buffer.
    pub fn vacant_len(&self) -> usize {
        self.inner.vacant_len()
    }
}

pub struct AudioConsumer {
    inner: HeapCons<f32>,
}

unsafe impl Send for AudioConsumer {}

impl AudioConsumer {
    /// Pop a single sample from the ring buffer.
    pub fn pop(&mut self) -> Option<f32> {
        self.inner.try_pop()
    }

    /// Pop samples into a destination slice.
    /// Returns the number of samples read.
    pub fn pop_slice(&mut self, dest: &mut [f32]) -> usize {
        self.inner.pop_slice(dest)
    }

    /// Read all available samples into a Vec<f32>.
    pub fn pop_all(&mut self) -> Vec<f32> {
        let count = self.inner.occupied_len();
        if count == 0 {
            return Vec::new();
        }
        let mut buf = vec![0.0f32; count];
        let read = self.inner.pop_slice(&mut buf);
        buf.truncate(read);
        buf
    }

    /// Returns the number of occupied samples ready to be read.
    pub fn occupied_len(&self) -> usize {
        self.inner.occupied_len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_ringbuffer_basic_push_pop() {
        let pool = AudioBufferPool::new(1024);
        let (mut prod, mut cons) = pool.split();

        let samples = vec![0.1f32, -0.2, 0.3, -0.4, 0.5];
        let written = prod.push_slice(&samples);
        assert_eq!(written, 5);
        assert_eq!(cons.occupied_len(), 5);

        let mut read_buf = vec![0.0f32; 5];
        let read = cons.pop_slice(&mut read_buf);
        assert_eq!(read, 5);
        assert_eq!(read_buf, samples);
        assert_eq!(cons.occupied_len(), 0);
    }

    #[test]
    fn test_ringbuffer_spsc_concurrency() {
        let pool = AudioBufferPool::new(8192);
        let (mut prod, mut cons) = pool.split();

        let total_samples = 50_000;

        let producer_handle = thread::spawn(move || {
            let mut sent = 0;
            while sent < total_samples {
                let chunk_size = std::cmp::min(128, total_samples - sent);
                let chunk: Vec<f32> = (sent..sent + chunk_size).map(|v| v as f32).collect();
                let written = prod.push_slice(&chunk);
                sent += written;
                if written == 0 {
                    thread::yield_now();
                }
            }
        });

        let consumer_handle = thread::spawn(move || {
            let mut received = 0;
            let mut temp = vec![0.0f32; 256];
            while received < total_samples {
                let read = cons.pop_slice(&mut temp);
                for i in 0..read {
                    assert_eq!(temp[i], (received + i) as f32);
                }
                received += read;
                if read == 0 {
                    thread::yield_now();
                }
            }
            received
        });

        producer_handle.join().expect("Producer panicked");
        let total_read = consumer_handle.join().expect("Consumer panicked");
        assert_eq!(total_read, total_samples);
    }
}
